import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reuseSeedAuthSession } from './auth-bootstrap';

function createIsolatedSeedAuthPage() {
  const cookies = vi.fn().mockResolvedValue([{ name: 'jagalchi-session', value: '1' }]);
  return {
    request: {
      get: vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('csrf-token')) {
          return {
            status: () => 200,
            ok: () => true,
            json: async () => ({ token: 'csrf' }),
          };
        }
        if (url.includes('/api/project-runs/')) {
          return { status: () => 200, ok: () => true };
        }
        return { status: () => 404, ok: () => false };
      }),
      patch: vi.fn().mockResolvedValue({ status: () => 200, ok: () => true }),
    },
    goto: vi.fn().mockResolvedValue(undefined),
    context: () => ({ cookies }),
  };
}

describe('phase-two fixture auth contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('E2E_SEED_PROJECT_RUN_ID', '22222222-2222-4222-8222-222222222222');
  });

  it('authenticates two isolated contexts from persisted storage without login', async () => {
    const pageA = createIsolatedSeedAuthPage();
    const pageB = createIsolatedSeedAuthPage();

    await reuseSeedAuthSession(pageA as never);
    await reuseSeedAuthSession(pageB as never);

    expect(pageA.goto).not.toHaveBeenCalled();
    expect(pageB.goto).not.toHaveBeenCalled();
    expect(pageA.context().cookies).not.toBe(pageB.context().cookies);
    expect(pageA.request.get).toHaveBeenCalled();
    expect(pageB.request.get).toHaveBeenCalled();
  });
});
