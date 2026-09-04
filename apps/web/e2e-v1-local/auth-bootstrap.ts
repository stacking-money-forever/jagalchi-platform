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

const SESSION_COOKIE_KEY = 'jagalchi-session';

async function hasUiSessionCookie(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some((cookie) => cookie.name === SESSION_COOKIE_KEY && cookie.value === '1');
}

export async function hydrateUiSession(page: Page): Promise<void> {
  await page.goto('/');
  await expect.poll(async () => hasUiSessionCookie(page), { timeout: 10_000 }).toBe(true);
}

export async function ensureSeedAuthSession(page: Page): Promise<void> {
  const projectRunId = required('E2E_SEED_PROJECT_RUN_ID');
  let sessionProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(sessionProbe.status());

  const needsLogin = sessionProbe.status() !== 200 || !(await hasUiSessionCookie(page));
  if (!needsLogin) {
    return;
  }

  const { email, password, userId } = readSeedAuthCredentials();
  await loginWithSeedUser(page, email, password, userId);

  sessionProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(sessionProbe.status());
  expect(sessionProbe.status(), 'seed session must be entitled after login').toBe(200);
  expect(
    await hasUiSessionCookie(page),
    'seed session hint cookie must be present after login',
  ).toBe(true);
}
