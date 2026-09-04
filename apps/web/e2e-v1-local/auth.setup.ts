import { test as setup } from '@playwright/test';

import { bootstrapSeedAuthStorage } from './seed-auth-storage';

setup('authenticate seed user once', async ({ browser }) => {
  await bootstrapSeedAuthStorage(browser);
});
