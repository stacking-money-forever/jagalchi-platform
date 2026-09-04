import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authBootstrap from './auth-bootstrap';
import {
  SEED_LOGIN_RATE_LIMIT_ERROR,
  SEED_SESSION_RATE_LIMIT_ERROR,
  assertProbeNotRateLimited,
} from './auth-bootstrap';

describe('auth-bootstrap', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('E2E_SEED_PROJECT_RUN_ID', '22222222-2222-4222-8222-222222222222');
    vi.stubEnv('E2E_TEST_EMAIL', 'seed@example.test');
    vi.stubEnv('E2E_TEST_PASSWORD', 'seed-password');
    vi.stubEnv('E2E_SEED_USER_ID', '11111111-1111-4111-8111-111111111111');
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

    await expect(authBootstrap.ensureSeedAuthSession(page as never)).rejects.toThrow(
      SEED_SESSION_RATE_LIMIT_ERROR,
    );
  });

  it('hydrates the UI session hint when the API probe succeeds without a cookie', async () => {
    let cookieChecks = 0;
    const page = {
      request: {
        get: vi.fn().mockResolvedValue({ status: () => 200 }),
      },
      goto: vi.fn().mockResolvedValue(undefined),
      context: () => ({
        cookies: vi.fn().mockImplementation(async () => {
          cookieChecks += 1;
          return cookieChecks >= 2 ? [{ name: 'jagalchi-session', value: '1' }] : [];
        }),
      }),
    };

    await authBootstrap.ensureSeedAuthSession(page as never);

    expect(page.goto).toHaveBeenCalledWith('/');
    expect(page.request.get).toHaveBeenCalledTimes(1);
    expect(cookieChecks).toBeGreaterThanOrEqual(2);
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

    await authBootstrap.ensureSeedAuthSession(page as never);

    expect(page.request.get).toHaveBeenCalledTimes(1);
  });

  it('requests the entitled project run when probing the seed session', async () => {
    const page = {
      request: {
        get: vi.fn().mockResolvedValue({ status: () => 200 }),
      },
    };

    await authBootstrap.probeEntitledSeedSession(page as never);
    expect(page.request.get).toHaveBeenCalledWith(
      '/api/project-runs/22222222-2222-4222-8222-222222222222',
    );
  });

  it('surfaces login rate limits without blind retries', () => {
    expect(SEED_LOGIN_RATE_LIMIT_ERROR).toContain('refusing blind retry');
  });
});
