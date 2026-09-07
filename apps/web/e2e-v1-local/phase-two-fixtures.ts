/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture callbacks are not React hooks */
import { test as base } from '@playwright/test';

import { probeEntitledSeedSession } from './auth-bootstrap';
import { bootstrapSeedAuthStorage } from './seed-auth-storage';

import type { BrowserContext, Page } from '@playwright/test';

type WorkerFixtures = {
  seedAuthStoragePath: string;
};

const SESSION_COOKIE_KEY = 'jagalchi-session';

/** Persist the latest cookie jar to the worker path. */
export async function persistWorkerSeedAuthStorage(
  context: BrowserContext,
  storagePath: string,
): Promise<void> {
  await context.storageState({ path: storagePath });
}

/**
 * Persist a context only when a read-only entitlement probe and the UI session
 * hint both confirm that the cookie jar is still reusable.
 */
export async function persistWorkerSeedAuthStorageIfHealthy(
  context: BrowserContext,
  storagePath: string,
): Promise<boolean> {
  let probePage: Page | undefined;
  try {
    probePage = await context.newPage();
    const sessionProbe = await probeEntitledSeedSession(probePage);
    const hasSessionHint = (await context.cookies()).some(
      (cookie) => cookie.name === SESSION_COOKIE_KEY && cookie.value === '1',
    );
    if (sessionProbe.status() !== 200 || !hasSessionHint) {
      return false;
    }
    await persistWorkerSeedAuthStorage(context, storagePath);
    return true;
  } catch {
    return false;
  } finally {
    await probePage?.close().catch(() => undefined);
  }
}

export const test = base.extend<object, WorkerFixtures>({
  seedAuthStoragePath: [
    async ({ browser }, use) => {
      const storagePath = await bootstrapSeedAuthStorage(browser);
      await use(storagePath);
    },
    { scope: 'worker', timeout: 180_000 },
  ],

  context: async ({ browser, seedAuthStoragePath }, use) => {
    const context = await browser.newContext({ storageState: seedAuthStoragePath });
    try {
      await use(context);
    } finally {
      await persistWorkerSeedAuthStorageIfHealthy(context, seedAuthStoragePath);
      await context.close();
    }
  },
});

export { expect } from '@playwright/test';
