import { afterEach, describe, expect, it, vi } from 'vitest';

const { capture, exchangeOAuthCode } = vi.hoisted(() => ({
  capture: vi.fn(),
  exchangeOAuthCode: vi.fn().mockResolvedValue({ authenticated: true }),
}));

vi.mock('@/api/auth', () => ({
  exchangeOAuthCode,
}));
vi.mock('@/lib/analytics/client', () => ({ capture }));

import { beginOAuth } from './oauth';

describe('native OAuth bridge', () => {
  afterEach(() => {
    delete window.ReactNativeWebView;
    vi.clearAllMocks();
  });

  it('exchanges only the one-time code returned by the native shell', async () => {
    const postMessage = vi.fn();
    window.ReactNativeWebView = { postMessage };

    const pending = beginOAuth('/api/users/auth/login/apple');
    expect(postMessage).toHaveBeenCalledOnce();
    const request = JSON.parse(postMessage.mock.calls[0]?.[0] as string) as {
      id: string;
      authorizationUrl: string;
      callbackUrl: string;
    };
    expect(request.authorizationUrl).toContain('returnUrl=jagalchi%3A%2F%2Foauth%2Fcallback');
    expect(request.callbackUrl).toBe('jagalchi://oauth/callback');

    window.dispatchEvent(
      new CustomEvent('jagalchi:native-result', {
        detail: {
          id: request.id,
          action: 'oauth',
          ok: true,
          callbackUrl: 'jagalchi://oauth/callback?code=one-time-code',
        },
      }),
    );

    await expect(pending).resolves.toEqual({ authenticated: true });
    expect(exchangeOAuthCode).toHaveBeenCalledWith('one-time-code');
    expect(capture).toHaveBeenCalledWith('oauth_completed', {});
  });
});
