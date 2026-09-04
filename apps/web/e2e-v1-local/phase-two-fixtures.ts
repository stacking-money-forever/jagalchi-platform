/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture callbacks are not React hooks */
import fs from 'node:fs';

import { test as base, type BrowserContext } from '@playwright/test';

import { ensureSeedAuthSession, reuseSeedAuthSession } from './auth-bootstrap';
import { resolveSeedAuthStoragePath } from './auth-state';

type WorkerFixtures = {
  workerAuthContext: BrowserContext;
};

export const test = base.extend<object, WorkerFixtures>({
  workerAuthContext: [
    async ({ browser }, use) => {
      const storagePath = resolveSeedAuthStoragePath();
      const hasPersistedStorage = fs.existsSync(storagePath);
      const context = await browser.newContext(
        hasPersistedStorage ? { storageState: storagePath } : undefined,
      );
      const bootstrapPage = await context.newPage();

      try {
        if (hasPersistedStorage) {
          try {
            await reuseSeedAuthSession(bootstrapPage);
          } catch {
            await ensureSeedAuthSession(bootstrapPage);
          }
        } else {
          await ensureSeedAuthSession(bootstrapPage);
        }
        await bootstrapPage.context().storageState({ path: storagePath });
      } finally {
        await bootstrapPage.close();
      }

      await use(context);
      await context.close();
    },
    { scope: 'worker', timeout: 180_000 },
  ],

  context: async ({ workerAuthContext }, use) => {
    await use(workerAuthContext);
  },
});

export { expect } from '@playwright/test';
