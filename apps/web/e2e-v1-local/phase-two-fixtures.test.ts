import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reuseSeedAuthSession } from './auth-bootstrap';
import {
  persistWorkerSeedAuthStorage,
  persistWorkerSeedAuthStorageIfHealthy,
} from './phase-two-fixtures';

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
  let hasSessionHint = false;
  const cookies = vi
    .fn()
    .mockImplementation(async () =>
      hasSessionHint ? [{ name: 'jagalchi-session', value: '1' }] : [],
    );
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ token: 'csrf-token' }),
    })
    .mockImplementation(async (url: string) => {
      if (url !== '/api/users/auth/refresh') {
        throw new Error(`unexpected browser fetch: ${url}`);
      }
      hasSessionHint = true;
      return { status: 200, ok: true };
    });
  vi.stubGlobal('fetch', fetchMock);

  return {
    generation,
    request: {
      get: vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/project-runs/')) {
          probeCalls += 1;
          return probeCalls === 1 && generation > 0
            ? { status: () => 401, ok: () => false }
            : { status: () => 200, ok: () => true };
        }
        return { status: () => 404, ok: () => false };
      }),
      patch: vi.fn(),
    },
    url: vi.fn().mockReturnValue('http://127.0.0.1:3100/'),
    goto: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn(async (callback: () => Promise<unknown>) => callback()),
    context: () => ({
      cookies,
      storageState: vi.fn().mockResolvedValue(undefined),
    }),
    fetchMock,
  };
}

function createHandoffContext({
  probeStatus,
  hasSessionHint,
  storageState,
}: {
  probeStatus: number;
  hasSessionHint: boolean;
  storageState: (options: { path: string }) => Promise<void>;
}) {
  const probePage = {
    request: {
      get: vi.fn().mockResolvedValue({
        status: () => probeStatus,
        ok: () => probeStatus === 200,
      }),
    },
    close: vi.fn().mockResolvedValue(undefined),
  };
  const cookies = vi
    .fn()
    .mockResolvedValue(hasSessionHint ? [{ name: 'jagalchi-session', value: '1' }] : []);

  return {
    context: {
      newPage: vi.fn().mockResolvedValue(probePage),
      cookies,
      storageState: vi.fn().mockImplementation(storageState),
    },
    probePage,
  };
}

describe('phase-two fixture auth contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('E2E_SEED_PROJECT_RUN_ID', '22222222-2222-4222-8222-222222222222');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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
    expect(pageA.request.patch).not.toHaveBeenCalled();
    expect(pageA.evaluate).toHaveBeenCalledTimes(1);
    expect(pageA.fetchMock).toHaveBeenCalledTimes(2);
    await expect(pageA.context().cookies()).resolves.toEqual([
      { name: 'jagalchi-session', value: '1' },
    ]);

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

    await persistWorkerSeedAuthStorage({ storageState } as never, storagePath);

    expect(storageState).toHaveBeenCalledWith({ path: storagePath });
  });

  it('hands healthy phase-one storage to the next map context', async () => {
    const storagePath = path.join(os.tmpdir(), `phase-two-phase-one-map-${process.pid}.json`);
    const rotatedRefresh = 'phase-one-refresh-rotated';

    await fs.writeFile(
      storagePath,
      JSON.stringify({
        cookies: [{ name: 'jagalchi_refresh', value: 'phase-one-refresh-initial' }],
      }),
    );

    const phaseOne = createHandoffContext({
      probeStatus: 200,
      hasSessionHint: true,
      storageState: async ({ path: outPath }) => {
        await fs.writeFile(
          outPath,
          JSON.stringify({
            cookies: [{ name: 'jagalchi_refresh', value: rotatedRefresh }],
          }),
        );
      },
    });

    try {
      await expect(
        persistWorkerSeedAuthStorageIfHealthy(phaseOne.context as never, storagePath),
      ).resolves.toBe(true);
      expect(phaseOne.probePage.close).toHaveBeenCalledOnce();

      const mapStorage = JSON.parse(await fs.readFile(storagePath, 'utf8')) as {
        cookies: Array<{ name: string; value: string }>;
      };
      expect(mapStorage.cookies[0]?.value).toBe(rotatedRefresh);

      const mapPage = createHealthySeedAuthPage();
      const result = await reuseSeedAuthSession(mapPage as never);
      expect(result.sessionMutated).toBe(false);
      expect(mapPage.request.patch).not.toHaveBeenCalled();
    } finally {
      await fs.rm(storagePath, { force: true });
    }
  });

  it('persists implicit BFF cookie rotation after an entitled probe', async () => {
    const storagePath = path.join(os.tmpdir(), `phase-two-implicit-rotation-${process.pid}.json`);
    const rotatedRefresh = 'refresh-token-v2-bff-implicit';

    const pageA = createHealthySeedAuthPage();
    const resultA = await reuseSeedAuthSession(pageA as never);
    expect(resultA.sessionMutated).toBe(false);

    const contextA = createHandoffContext({
      probeStatus: 200,
      hasSessionHint: true,
      storageState: async ({ path: outPath }) => {
        await fs.writeFile(
          outPath,
          JSON.stringify({
            cookies: [{ name: 'jagalchi_refresh', value: rotatedRefresh }],
          }),
        );
      },
    });

    try {
      await expect(
        persistWorkerSeedAuthStorageIfHealthy(contextA.context as never, storagePath),
      ).resolves.toBe(true);

      const persisted = JSON.parse(await fs.readFile(storagePath, 'utf8')) as {
        cookies: Array<{ name: string; value: string }>;
      };
      expect(persisted.cookies[0]?.value).toBe(rotatedRefresh);
    } finally {
      await fs.rm(storagePath, { force: true });
    }
  });

  it('does not poison healthy storage after an unauthenticated context', async () => {
    const storagePath = path.join(os.tmpdir(), `phase-two-non-poisoning-${process.pid}.json`);
    const healthyState = JSON.stringify({
      cookies: [{ name: 'jagalchi_refresh', value: 'last-healthy-refresh' }],
    });
    await fs.writeFile(storagePath, healthyState);

    const unauthenticated = createHandoffContext({
      probeStatus: 200,
      hasSessionHint: false,
      storageState: vi.fn().mockResolvedValue(undefined),
    });
    const failed = createHandoffContext({
      probeStatus: 401,
      hasSessionHint: false,
      storageState: vi.fn().mockResolvedValue(undefined),
    });

    try {
      await expect(
        persistWorkerSeedAuthStorageIfHealthy(unauthenticated.context as never, storagePath),
      ).resolves.toBe(false);
      await expect(
        persistWorkerSeedAuthStorageIfHealthy(failed.context as never, storagePath),
      ).resolves.toBe(false);
      expect(unauthenticated.context.storageState).not.toHaveBeenCalled();
      expect(failed.context.storageState).not.toHaveBeenCalled();
      expect(await fs.readFile(storagePath, 'utf8')).toBe(healthyState);
    } finally {
      await fs.rm(storagePath, { force: true });
    }
  });
});
