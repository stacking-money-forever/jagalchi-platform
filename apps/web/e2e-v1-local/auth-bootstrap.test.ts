import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SEED_AUTH_REUSE_ERROR,
  SEED_LOGIN_RATE_LIMIT_ERROR,
  SEED_SESSION_RATE_LIMIT_ERROR,
  assertProbeNotRateLimited,
  ensureSeedAuthSession,
  probeEntitledSeedSession,
  reuseSeedAuthSession,
} from './auth-bootstrap';

function createBrowserRefreshPage({
  projectProbeStatuses,
  refreshStatus,
  initialSessionHint = false,
  pageUrl = 'http://127.0.0.1:3100/',
}: {
  projectProbeStatuses: number[];
  refreshStatus: number;
  initialSessionHint?: boolean;
  pageUrl?: string;
}) {
  let hasSessionHint = initialSessionHint;
  const projectProbeStatusQueue = [...projectProbeStatuses];
  const cookies = vi
    .fn()
    .mockImplementation(async () =>
      hasSessionHint ? [{ name: 'jagalchi-session', value: '1' }] : [],
    );
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: 'csrf-token' }),
    })
    .mockImplementation(async (url: string) => {
      if (url !== '/api/users/auth/refresh') {
        throw new Error(`unexpected browser fetch: ${url}`);
      }
      if (refreshStatus === 200) {
        hasSessionHint = true;
      }
      return {
        ok: refreshStatus >= 200 && refreshStatus < 300,
        status: refreshStatus,
      };
    });
  vi.stubGlobal('fetch', fetchMock);

  const page = {
    request: {
      get: vi.fn().mockImplementation(async (url: string) => {
        if (!url.includes('/api/project-runs/')) {
          throw new Error(`unexpected API request: ${url}`);
        }
        const status = projectProbeStatusQueue.shift() ?? 500;
        return {
          ok: () => status >= 200 && status < 300,
          status: () => status,
        };
      }),
      patch: vi.fn(),
    },
    url: vi.fn().mockReturnValue(pageUrl),
    goto: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn(async (callback: () => Promise<unknown>) => callback()),
    context: () => ({ cookies }),
  };

  return { page, cookies, fetchMock };
}

describe('auth-bootstrap', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('E2E_SEED_PROJECT_RUN_ID', '22222222-2222-4222-8222-222222222222');
    vi.stubEnv('E2E_TEST_EMAIL', 'seed@example.test');
    vi.stubEnv('E2E_TEST_PASSWORD', 'seed-password');
    vi.stubEnv('E2E_SEED_USER_ID', '11111111-1111-4111-8111-111111111111');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('fails closed when the entitled session probe is rate limited', () => {
    expect(() => assertProbeNotRateLimited(429)).toThrow(SEED_SESSION_RATE_LIMIT_ERROR);
  });

  it('refuses to log in when the entitled probe is rate limited', async () => {
    const page = {
      request: {
        get: vi.fn().mockResolvedValue({ status: () => 429 }),
      },
    };

    await expect(ensureSeedAuthSession(page as never)).rejects.toThrow(
      SEED_SESSION_RATE_LIMIT_ERROR,
    );
  });

  it('reuses worker auth without attempting login when the entitled probe succeeds', async () => {
    const page = {
      request: {
        get: vi
          .fn()
          .mockResolvedValueOnce({ status: () => 200, ok: () => true })
          .mockResolvedValueOnce({
            status: () => 200,
            ok: () => true,
            json: async () => ({ token: 'csrf' }),
          }),
        patch: vi.fn().mockResolvedValue({ status: () => 200, ok: () => true }),
      },
      goto: vi.fn().mockResolvedValue(undefined),
      context: () => ({
        cookies: vi.fn().mockResolvedValue([{ name: 'jagalchi-session', value: '1' }]),
      }),
    };

    const result = await reuseSeedAuthSession(page as never);

    expect(result.sessionMutated).toBe(false);
    expect(page.request.get).toHaveBeenCalledTimes(1);
    expect(page.request.patch).not.toHaveBeenCalled();
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('fails closed on a browser refresh 401 without retrying or logging in', async () => {
    const { page, fetchMock } = createBrowserRefreshPage({
      projectProbeStatuses: [401, 401],
      refreshStatus: 401,
    });

    await expect(reuseSeedAuthSession(page as never)).rejects.toThrow(SEED_AUTH_REUSE_ERROR);

    expect(page.request.get).toHaveBeenCalledTimes(2);
    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(page.request.patch).not.toHaveBeenCalled();
  });

  it('stops on a browser refresh 429 without a retry or follow-up probe', async () => {
    const { page, fetchMock } = createBrowserRefreshPage({
      projectProbeStatuses: [401],
      refreshStatus: 429,
    });

    await expect(reuseSeedAuthSession(page as never)).rejects.toThrow(
      SEED_SESSION_RATE_LIMIT_ERROR,
    );

    expect(page.request.get).toHaveBeenCalledTimes(1);
    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(page.request.patch).not.toHaveBeenCalled();
  });

  it('recovers an entitled probe through one browser refresh', async () => {
    const { page, fetchMock } = createBrowserRefreshPage({
      projectProbeStatuses: [401, 200],
      refreshStatus: 200,
    });

    const result = await reuseSeedAuthSession(page as never);

    expect(result.sessionMutated).toBe(true);
    expect(page.request.get).toHaveBeenCalledTimes(2);
    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(page.request.patch).not.toHaveBeenCalled();
  });

  it('hydrates the UI session cookie through same-origin browser fetch', async () => {
    const { page, cookies, fetchMock } = createBrowserRefreshPage({
      projectProbeStatuses: [200, 200],
      refreshStatus: 200,
      pageUrl: 'https://evil.example/',
    });

    await ensureSeedAuthSession(page as never);

    expect(page.goto).toHaveBeenCalledWith('http://127.0.0.1:3100/');
    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(page.request.patch).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf-token', {
      credentials: 'same-origin',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/users/auth/refresh', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'X-CSRF-Token': 'csrf-token',
      },
    });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).not.toHaveProperty('Origin');
    expect(fetchMock.mock.calls[1]?.[1]?.headers).not.toHaveProperty('origin');
    expect(cookies).toHaveBeenCalled();
    await expect(page.context().cookies()).resolves.toEqual([
      { name: 'jagalchi-session', value: '1' },
    ]);
  });

  it('reuses an entitled session when the API probe and UI cookie are both present', async () => {
    const page = {
      request: {
        get: vi.fn().mockResolvedValue({ status: () => 200 }),
      },
      context: () => ({
        cookies: vi.fn().mockResolvedValue([{ name: 'jagalchi-session', value: '1' }]),
      }),
    };

    await ensureSeedAuthSession(page as never);

    expect(page.request.get).toHaveBeenCalledTimes(1);
  });

  it('requests the entitled project run when probing the seed session', async () => {
    const page = {
      request: {
        get: vi.fn().mockResolvedValue({ status: () => 200 }),
      },
    };

    await probeEntitledSeedSession(page as never);
    expect(page.request.get).toHaveBeenCalledWith(
      '/api/project-runs/22222222-2222-4222-8222-222222222222',
    );
  });

  it('surfaces login rate limits without blind retries', () => {
    expect(SEED_LOGIN_RATE_LIMIT_ERROR).toContain('refusing blind retry');
  });
});
