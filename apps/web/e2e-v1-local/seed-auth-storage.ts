import fs from 'node:fs';

import { ensureSeedAuthSession, reuseSeedAuthSession } from './auth-bootstrap';
import { resolveSeedAuthStoragePath } from './auth-state';

import type { Browser, Page } from '@playwright/test';

export async function persistSeedAuthStorage(page: Page): Promise<string> {
  const storagePath = resolveSeedAuthStoragePath();
  await page.context().storageState({ path: storagePath });
  return storagePath;
}

/**
 * Establish one entitled seed session at worker/setup scope and persist cookies to disk.
 * Login is allowed only here — per-test contexts must reuse via storageState + refresh.
 */
export async function bootstrapSeedAuthStorage(browser: Browser): Promise<string> {
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
    return await persistSeedAuthStorage(bootstrapPage);
  } finally {
    await bootstrapPage.close();
    await context.close();
  }
}
