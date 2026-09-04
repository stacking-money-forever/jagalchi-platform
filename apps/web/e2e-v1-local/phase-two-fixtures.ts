/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture callbacks are not React hooks */
import { test as base } from '@playwright/test';

import { bootstrapSeedAuthStorage } from './seed-auth-storage';

type WorkerFixtures = {
  seedAuthStoragePath: string;
};

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
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
