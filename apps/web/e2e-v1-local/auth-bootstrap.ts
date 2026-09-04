import { expect, type Page } from '@playwright/test';

import { readSeedAuthCredentials } from './auth-state';
import { loginWithSeedUser, required } from './helpers';

export const SEED_SESSION_RATE_LIMIT_ERROR =
  'seed session probe was rate limited; refusing blind login retry';
export const SEED_LOGIN_RATE_LIMIT_ERROR = 'seed login was rate limited; refusing blind retry';

export function assertProbeNotRateLimited(status: number): void {
  if (status === 429) {
    throw new Error(SEED_SESSION_RATE_LIMIT_ERROR);
  }
}

export async function probeEntitledSeedSession(
  page: Page,
  projectRunId = required('E2E_SEED_PROJECT_RUN_ID'),
) {
  return page.request.get(`/api/project-runs/${projectRunId}`);
}

export async function hydrateUiSession(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('link', { name: '로그인' })).not.toBeVisible();
}

export async function ensureSeedAuthSession(page: Page): Promise<void> {
  const projectRunId = required('E2E_SEED_PROJECT_RUN_ID');
  const sessionProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(sessionProbe.status());

  if (sessionProbe.status() === 200) {
    await hydrateUiSession(page);
    return;
  }

  const { email, password, userId } = readSeedAuthCredentials();
  await loginWithSeedUser(page, email, password, userId);

  const entitledProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(entitledProbe.status());
  expect(entitledProbe.status(), 'seed session must be entitled after login').toBe(200);
  await hydrateUiSession(page);
}
