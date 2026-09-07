import { act, render, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analytics = vi.hoisted(() => ({
  capture: vi.fn(() => true),
  reconcilePersistedIdentity: vi.fn(() => Promise.resolve(true)),
}));
let pathname = '/';

vi.mock('@/lib/analytics/client', () => analytics);
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { sessionPresentAtom, currentUserIdAtom, isAuthInitializedAtom } from '@/lib/auth-atoms';

import { AnalyticsProvider } from './AnalyticsProvider';

function renderProvider(initialized: boolean, userId: string | null, path = '/') {
  pathname = path;
  const store = createStore();
  store.set(isAuthInitializedAtom, initialized);
  store.set(sessionPresentAtom, userId !== null);
  store.set(currentUserIdAtom, userId);
  const view = render(
    <Provider store={store}>
      <AnalyticsProvider>
        <div>content</div>
      </AnalyticsProvider>
    </Provider>,
  );
  return { store, ...view };
}

describe('AnalyticsProvider', () => {
  beforeEach(() => {
    pathname = '/';
    vi.clearAllMocks();
    analytics.reconcilePersistedIdentity.mockResolvedValue(true);
    analytics.capture.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('waits for settled auth before reconciliation or mapped page capture', async () => {
    const { store } = renderProvider(false, null, '/career');
    expect(analytics.reconcilePersistedIdentity).not.toHaveBeenCalled();
    expect(analytics.capture).not.toHaveBeenCalled();

    await act(async () => {
      store.set(isAuthInitializedAtom, true);
    });
    await waitFor(() => {
      expect(analytics.reconcilePersistedIdentity).toHaveBeenCalledWith(null);
      expect(analytics.capture).toHaveBeenCalledWith('page_viewed', {
        page_key: 'career',
        auth_state: 'anonymous',
      });
    });
  });

  it('uses the settled opaque user id and authenticated state for a mapped page', async () => {
    renderProvider(true, 'opaque-user-id', '/login');
    await waitFor(() => {
      expect(analytics.reconcilePersistedIdentity).toHaveBeenCalledWith('opaque-user-id');
      expect(analytics.capture).toHaveBeenCalledWith('page_viewed', {
        page_key: 'login',
        auth_state: 'authenticated',
      });
    });
  });

  it('reconciles identity but does not track callback, dynamic, unknown, or trailing paths', async () => {
    for (const path of ['/auth/callback', '/career/123', '/unknown', '/career/']) {
      vi.clearAllMocks();
      const view = renderProvider(true, null, path);
      await waitFor(() => expect(analytics.reconcilePersistedIdentity).toHaveBeenCalledWith(null));
      expect(analytics.capture).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it('does not capture until reconciliation succeeds', async () => {
    analytics.reconcilePersistedIdentity.mockResolvedValue(false);
    renderProvider(true, null, '/');
    await waitFor(() => expect(analytics.reconcilePersistedIdentity).toHaveBeenCalled());
    expect(analytics.capture).not.toHaveBeenCalled();
  });

  it('emits a mapped page exactly once across auth changes and Strict Mode remounts', async () => {
    const { store, rerender } = renderProvider(true, null, '/');
    await waitFor(() => expect(analytics.capture).toHaveBeenCalledTimes(1));

    await act(async () => {
      store.set(sessionPresentAtom, true);
      store.set(currentUserIdAtom, 'opaque-user-id');
    });
    await waitFor(() =>
      expect(analytics.reconcilePersistedIdentity).toHaveBeenCalledWith('opaque-user-id'),
    );
    expect(analytics.capture).toHaveBeenCalledTimes(1);

    rerender(
      <Provider store={store}>
        <AnalyticsProvider>
          <div>content</div>
        </AnalyticsProvider>
      </Provider>,
    );
    await Promise.resolve();
    expect(analytics.capture).toHaveBeenCalledTimes(1);
  });
});
