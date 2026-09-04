import fs from 'node:fs';

import { test as setup } from '@playwright/test';

import { ensureSeedAuthSession } from './auth-bootstrap';
import { ensureSeedAuthStorageDir, resolveSeedAuthStoragePath } from './auth-state';

setup('authenticate seed user once', async ({ browser }) => {
  const storagePath = resolveSeedAuthStoragePath();
  const context = await browser.newContext(
    fs.existsSync(storagePath) ? { storageState: storagePath } : undefined,
  );
  const page = await context.newPage();

  try {
    await ensureSeedAuthSession(page);
    const authDir = ensureSeedAuthStorageDir();
    await context.storageState({ path: resolveSeedAuthStoragePath(authDir) });
  } finally {
    await context.close();
  }
});
