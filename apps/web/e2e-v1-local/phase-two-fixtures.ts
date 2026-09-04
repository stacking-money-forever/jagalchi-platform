/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture callbacks are not React hooks */
import { test as base } from '@playwright/test';

import { bootstrapSeedAuthStorage } from './seed-auth-storage';

import type { BrowserContext } from '@playwright/test';

type WorkerFixtures = {
  seedAuthStoragePath: string;
};

/** Persist the latest cookie jar after each per-test context so serial reuse stays rotation-safe. */
export async function persistWorkerSeedAuthStorage(
  context: BrowserContext,
  storagePath: string,
): Promise<void> {
  await context.storageState({ path: storagePath });
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
      await persistWorkerSeedAuthStorage(context, seedAuthStoragePath);
      await context.close();
    }
  },
});

export { expect } from '@playwright/test';
