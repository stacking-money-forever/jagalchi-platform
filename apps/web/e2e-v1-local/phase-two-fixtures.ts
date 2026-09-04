/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture callbacks are not React hooks */
import fs from 'node:fs';

import { test as base, type BrowserContext } from '@playwright/test';

import { ensureSeedAuthSession } from './auth-bootstrap';
import { resolveSeedAuthStoragePath } from './auth-state';

type WorkerFixtures = {
  workerAuthContext: BrowserContext;
};

export const test = base.extend<object, WorkerFixtures>({
  workerAuthContext: [
    async ({ browser }, use) => {
      const storagePath = resolveSeedAuthStoragePath();
      const context = await browser.newContext(
        fs.existsSync(storagePath) ? { storageState: storagePath } : undefined,
      );
      const bootstrapPage = await context.newPage();

      try {
        await ensureSeedAuthSession(bootstrapPage);
      } finally {
        await bootstrapPage.close();
      }

      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  context: async ({ workerAuthContext }, use) => {
    await use(workerAuthContext);
  },
});

export { expect } from '@playwright/test';
