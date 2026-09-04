import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reuseSeedAuthSession } from './auth-bootstrap';
import { persistWorkerSeedAuthStorage } from './phase-two-fixtures';

function createHealthySeedAuthPage() {
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

function createStaleStorageSeedAuthPage(generation: number) {
  let probeCalls = 0;
  const cookies = vi.fn().mockResolvedValue([{ name: 'jagalchi-session', value: '1' }]);
  return {
    generation,
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
          probeCalls += 1;
          return probeCalls === 1 && generation > 0
            ? { status: () => 401, ok: () => false }
            : { status: () => 200, ok: () => true };
        }
        return { status: () => 404, ok: () => false };
      }),
      patch: vi.fn().mockResolvedValue({ status: () => 200, ok: () => true }),
    },
    goto: vi.fn().mockResolvedValue(undefined),
    context: () => ({
      cookies,
      storageState: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

describe('phase-two fixture auth contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('E2E_SEED_PROJECT_RUN_ID', '22222222-2222-4222-8222-222222222222');
  });

  it('authenticates two isolated contexts from persisted storage without login', async () => {
    const pageA = createHealthySeedAuthPage();
    const pageB = createHealthySeedAuthPage();

    const resultA = await reuseSeedAuthSession(pageA as never);
    const resultB = await reuseSeedAuthSession(pageB as never);

    expect(resultA.sessionMutated).toBe(false);
    expect(resultB.sessionMutated).toBe(false);
    expect(pageA.goto).not.toHaveBeenCalled();
    expect(pageB.goto).not.toHaveBeenCalled();
    expect(pageA.context().cookies).not.toBe(pageB.context().cookies);
    expect(pageA.request.get).toHaveBeenCalled();
    expect(pageB.request.get).toHaveBeenCalled();
    expect(pageA.request.patch).not.toHaveBeenCalled();
    expect(pageB.request.patch).not.toHaveBeenCalled();
  });

  it('persists rotated auth only when refresh is required before the next isolated context', async () => {
    const persistCalls: number[] = [];
    const persistSeedAuthStorage = async (page: { generation: number }) => {
      persistCalls.push(page.generation);
    };

    const pageA = createStaleStorageSeedAuthPage(1);
    const pageB = createHealthySeedAuthPage();

    const resultA = await reuseSeedAuthSession(pageA as never);
    expect(resultA.sessionMutated).toBe(true);
    expect(pageA.request.patch).toHaveBeenCalledTimes(1);

    if (resultA.sessionMutated) {
      await persistSeedAuthStorage(pageA as never);
    }

    const resultB = await reuseSeedAuthSession(pageB as never);
    expect(resultB.sessionMutated).toBe(false);
    expect(pageB.request.patch).not.toHaveBeenCalled();
    expect(persistCalls).toEqual([1]);
  });

  it('writes the latest cookie jar back to the worker storage path after each context', async () => {
    const storageState = vi.fn().mockResolvedValue(undefined);
    const storagePath = '/tmp/seed-user.json';

    await persistWorkerSeedAuthStorage({ storageState }, storagePath);

    expect(storageState).toHaveBeenCalledWith({ path: storagePath });
  });
});
