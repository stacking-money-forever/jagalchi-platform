import { renderHook, act } from '@testing-library/react';
import { useSetAtom } from 'jotai';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createTestWrapper } from '@/test-utils';

let currentAccessToken: string | null = null;
const mockSetAccessToken = vi.fn((token: string) => {
  currentAccessToken = token;
});
const mockClearAccessToken = vi.fn(() => {
  currentAccessToken = null;
});
const mockBeginAuthSessionEnding = vi.fn(() => Promise.resolve());
const mockCompleteAuthSessionEnding = vi.fn();
const mockRestoreAuthSession = vi.fn();
const authSessionResumeListeners = new Set<() => void>();
const mockBeginIdentityEnding = vi.fn();
const mockFinishIdentityEnding = vi.fn((_userId: string | null) => Promise.resolve(true));
const sessionFor = (id: string) => ({
  authenticated: true as const,
  user: { id, email: `${id}@example.com`, name: id, roles: ['USER'] },
});

vi.mock('@/api/auth', () => ({
  refreshToken: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  hasActiveWebSession: () => currentAccessToken !== null,
  markWebSessionActive: () => mockSetAccessToken('web-session'),
  clearWebSessionPresence: () => mockClearAccessToken(),
  beginAuthSessionEnding: () => mockBeginAuthSessionEnding(),
  completeAuthSessionEnding: () => mockCompleteAuthSessionEnding(),
  restoreAuthSessionAfterEnding: () => {
    mockRestoreAuthSession();
    authSessionResumeListeners.forEach((listener) => listener());
  },
  subscribeToAuthSessionResume: (listener: () => void) => {
    authSessionResumeListeners.add(listener);
    return () => authSessionResumeListeners.delete(listener);
  },
}));

vi.mock('@/lib/analytics/client', () => ({
  beginIdentityEnding: () => mockBeginIdentityEnding(),
  finishIdentityEnding: (userId: string | null) => mockFinishIdentityEnding(userId),
}));

import { logout, refreshToken } from '@/api/auth';

import { loginAtom } from '../stores/auth.atoms';
import { useRefreshToken } from './use-refresh-token';

describe('useRefreshToken', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    currentAccessToken = null;
  });

  afterEach(() => {
    authSessionResumeListeners.clear();
    vi.useRealTimers();
  });

  it('calls refreshToken on mount and sets initialized', async () => {
    vi.mocked(refreshToken).mockResolvedValue({ authenticated: true });

    renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });

    // flush the initial async refresh (use runOnlyPendingTimers to avoid infinite interval loop)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(refreshToken).toHaveBeenCalled();
    // loginAtom calls setAccessToken internally
    expect(mockSetAccessToken).toHaveBeenCalledWith('web-session');
  });

  it('clears token and logs out on refresh failure', async () => {
    vi.mocked(refreshToken).mockRejectedValue(new Error('expired'));

    renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // logoutAtom calls clearAccessToken, plus the hook itself calls clearAccessToken
    expect(mockClearAccessToken).toHaveBeenCalled();
  });

  it('does not clear a newer interactive login when the initial refresh fails late', async () => {
    let rejectRefresh: (error: Error) => void = () => undefined;
    vi.mocked(refreshToken).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRefresh = reject;
        }),
    );

    renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });
    currentAccessToken = 'interactive-login-token';
    rejectRefresh(new Error('stale refresh failed'));

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockClearAccessToken).not.toHaveBeenCalled();
    expect(currentAccessToken).toBe('interactive-login-token');
  });

  it('starts interval on successful refresh', async () => {
    vi.mocked(refreshToken).mockResolvedValue({ authenticated: true });

    renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    vi.mocked(refreshToken).mockClear();

    // Advance by 14 minutes
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });

    expect(refreshToken).toHaveBeenCalledTimes(1);
  });

  it('does not start interval on failed refresh', async () => {
    vi.mocked(refreshToken).mockRejectedValue(new Error('fail'));

    renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    vi.mocked(refreshToken).mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });

    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('cleans up interval on unmount', async () => {
    vi.mocked(refreshToken).mockResolvedValue({ authenticated: true });

    const { unmount } = renderHook(() => useRefreshToken(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    unmount();
    vi.mocked(refreshToken).mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });

    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('does not let a never-settling hook refresh block logout', async () => {
    vi.mocked(refreshToken).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(logout).mockResolvedValue({ localSessionCleared: true, revokeConfirmed: true });

    const { result } = renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });
    expect(refreshToken).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.logoutSession();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(mockClearAccessToken).toHaveBeenCalled();
    expect(mockCompleteAuthSessionEnding).toHaveBeenCalledTimes(1);
    expect(mockFinishIdentityEnding).toHaveBeenCalledWith(null);
    expect(mockFinishIdentityEnding).toHaveBeenCalledBefore(mockCompleteAuthSessionEnding);
  });

  it('finalizes a successful logout after the provider remounts', async () => {
    let resolveLogout: (() => void) | undefined;
    vi.mocked(refreshToken)
      .mockResolvedValueOnce({ authenticated: true })
      .mockImplementationOnce(() => new Promise(() => undefined));
    vi.mocked(logout).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogout = () =>
            resolve({ localSessionCleared: true as const, revokeConfirmed: true });
        }),
    );

    const { result, unmount } = renderHook(() => useRefreshToken(), {
      wrapper: createTestWrapper(),
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    mockClearAccessToken.mockClear();
    mockFinishIdentityEnding.mockClear();

    let logoutRequest = Promise.resolve();
    await act(async () => {
      logoutRequest = result.current.logoutSession();
      await Promise.resolve();
    });
    expect(logout).toHaveBeenCalledTimes(1);

    unmount();
    const remounted = renderHook(() => useRefreshToken(), {
      wrapper: createTestWrapper(),
    });
    await act(async () => {
      resolveLogout?.();
      await logoutRequest;
    });

    expect(mockClearAccessToken).toHaveBeenCalledTimes(1);
    expect(mockFinishIdentityEnding).toHaveBeenCalledWith(null);
    remounted.unmount();
  });

  it('invalidates an in-flight refresh and cancels the interval before logout', async () => {
    let resolveRefresh: ((value: { authenticated: true }) => void) | undefined;
    vi.mocked(refreshToken)
      .mockResolvedValue({ authenticated: true })
      .mockResolvedValueOnce({ authenticated: true })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    vi.mocked(logout).mockResolvedValue({ localSessionCleared: true, revokeConfirmed: true });

    const { result } = renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    mockSetAccessToken.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });

    const logoutRequest = result.current.logoutSession();
    await act(async () => {
      resolveRefresh?.({ authenticated: true });
      await logoutRequest;
    });

    expect(mockBeginIdentityEnding).toHaveBeenCalledTimes(1);
    expect(mockBeginAuthSessionEnding).toHaveBeenCalledBefore(vi.mocked(logout));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(mockFinishIdentityEnding).toHaveBeenCalledWith(null);
    expect(mockSetAccessToken).not.toHaveBeenCalledWith('stale-token');
    expect(mockClearAccessToken).toHaveBeenCalled();
    expect(mockCompleteAuthSessionEnding).toHaveBeenCalledTimes(1);

    vi.mocked(refreshToken).mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('starts periodic refresh again when a new user logs in after logout', async () => {
    vi.mocked(refreshToken)
      .mockResolvedValueOnce(sessionFor('first-user'))
      .mockResolvedValue(sessionFor('second-user'));
    vi.mocked(logout).mockResolvedValue({ localSessionCleared: true, revokeConfirmed: true });

    const { result } = renderHook(
      () => ({ session: useRefreshToken(), setLogin: useSetAtom(loginAtom) }),
      { wrapper: createTestWrapper() },
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    await act(async () => {
      await result.current.session.logoutSession();
    });

    vi.mocked(refreshToken).mockClear();
    act(() => result.current.setLogin(sessionFor('second-user')));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });

    expect(refreshToken).toHaveBeenCalledTimes(1);
  });

  it('keeps the local session and exposes a retryable error when revoke fails', async () => {
    vi.mocked(refreshToken).mockResolvedValue({ authenticated: true });
    vi.mocked(logout).mockRejectedValue(new Error('revoke failed'));

    const { result } = renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    mockClearAccessToken.mockClear();

    let logoutError: unknown;
    await act(async () => {
      try {
        await result.current.logoutSession();
      } catch (error) {
        logoutError = error;
      }
    });

    expect(logoutError).toEqual(new Error('revoke failed'));
    expect(mockClearAccessToken).not.toHaveBeenCalled();
    expect(mockBeginIdentityEnding).toHaveBeenCalledTimes(1);
    expect(mockFinishIdentityEnding).toHaveBeenCalled();
    expect(mockFinishIdentityEnding).toHaveBeenCalledBefore(mockRestoreAuthSession);

    vi.mocked(refreshToken).mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });
    expect(refreshToken).toHaveBeenCalledTimes(1);
  });

  it('clears UI identity and does not restore refresh when server revoke is unconfirmed', async () => {
    vi.mocked(refreshToken).mockResolvedValue(sessionFor('ending-user'));
    vi.mocked(logout).mockResolvedValue({
      localSessionCleared: true,
      revokeConfirmed: false,
    });
    const { result } = renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
      await result.current.logoutSession();
    });
    expect(mockClearAccessToken).toHaveBeenCalled();
    expect(mockFinishIdentityEnding).toHaveBeenCalledWith(null);
    expect(mockCompleteAuthSessionEnding).toHaveBeenCalledTimes(1);
    vi.mocked(refreshToken).mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('restores the remounted provider after revoke fails during session ending', async () => {
    let rejectLogout: ((error: Error) => void) | undefined;
    vi.mocked(refreshToken)
      .mockResolvedValueOnce(sessionFor('prior-user'))
      .mockResolvedValueOnce({ status: 'session-ending' })
      .mockResolvedValueOnce(sessionFor('prior-user'))
      .mockResolvedValue(sessionFor('prior-user'));
    vi.mocked(logout).mockImplementation(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectLogout = reject;
        }),
    );

    const initial = renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    mockClearAccessToken.mockClear();

    let logoutRequest = Promise.resolve();
    await act(async () => {
      logoutRequest = initial.result.current.logoutSession();
      await Promise.resolve();
    });
    expect(logout).toHaveBeenCalledTimes(1);

    initial.unmount();
    const remounted = renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });

    let logoutError: unknown;
    await act(async () => {
      rejectLogout?.(new Error('revoke failed'));
      try {
        await logoutRequest;
      } catch (error) {
        logoutError = error;
      }
    });

    expect(logoutError).toEqual(new Error('revoke failed'));
    expect(mockClearAccessToken).not.toHaveBeenCalled();
    expect(mockFinishIdentityEnding).toHaveBeenCalledWith('prior-user');
    expect(mockSetAccessToken).toHaveBeenCalledWith('web-session');

    vi.mocked(refreshToken).mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    remounted.unmount();
  });

  it('uses the same local cleanup path after account deletion succeeds', async () => {
    vi.mocked(refreshToken).mockResolvedValue({ authenticated: true });

    const { result } = renderHook(() => useRefreshToken(), { wrapper: createTestWrapper() });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    mockClearAccessToken.mockClear();

    await act(async () => {
      await result.current.beginSessionEnding();
      await result.current.clearDeletedSession();
    });

    expect(mockClearAccessToken).toHaveBeenCalled();
    expect(mockCompleteAuthSessionEnding).toHaveBeenCalledTimes(1);

    vi.mocked(refreshToken).mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });
    expect(refreshToken).not.toHaveBeenCalled();
  });
});
