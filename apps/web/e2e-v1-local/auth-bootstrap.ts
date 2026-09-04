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

async function refreshSessionHint(page: Page): Promise<boolean> {
  const csrfResponse = await page.request.get('/api/csrf-token');
  if (!csrfResponse.ok()) {
    return false;
  }

  const { token } = (await csrfResponse.json()) as { token?: string };
  if (!token) {
    return false;
  }

  const refreshResponse = await page.request.patch('/api/users/auth/refresh', {
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': token,
    },
  });
  assertProbeNotRateLimited(refreshResponse.status());
  return refreshResponse.ok() && (await hasUiSessionCookie(page));
}

/** @returns true when refresh or navigation established the UI session hint cookie */
export async function hydrateUiSession(page: Page): Promise<boolean> {
  if (await hasUiSessionCookie(page)) {
    return false;
  }

  if (await refreshSessionHint(page)) {
    return true;
  }

  await page.goto('/');
  if (await hasUiSessionCookie(page)) {
    return true;
  }

  if (await refreshSessionHint(page)) {
    return true;
  }

  await expect.poll(async () => hasUiSessionCookie(page), { timeout: 10_000 }).toBe(true);
  return true;
}

export const SEED_AUTH_REUSE_ERROR =
  'seed auth must be established by setup-seed-auth or the worker fixture before tests run';

export type ReuseSeedAuthSessionResult = {
  /** True when refresh/hydration rotated cookies — caller must persist storageState for later contexts */
  sessionMutated: boolean;
};

async function recoverEntitledSeedSessionProbe(
  page: Page,
  projectRunId: string,
): Promise<{
  sessionProbe: Awaited<ReturnType<typeof probeEntitledSeedSession>>;
  sessionMutated: boolean;
}> {
  let sessionMutated = false;
  let sessionProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(sessionProbe.status());
  if (sessionProbe.status() === 200) {
    return { sessionProbe, sessionMutated };
  }

  if (await refreshSessionHint(page)) {
    sessionMutated = true;
    sessionProbe = await probeEntitledSeedSession(page, projectRunId);
    assertProbeNotRateLimited(sessionProbe.status());
    if (sessionProbe.status() === 200) {
      return { sessionProbe, sessionMutated };
    }
  }

  if (await hydrateUiSession(page)) {
    sessionMutated = true;
  }
  sessionProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(sessionProbe.status());
  return { sessionProbe, sessionMutated };
}

export async function reuseSeedAuthSession(page: Page): Promise<ReuseSeedAuthSessionResult> {
  const projectRunId = required('E2E_SEED_PROJECT_RUN_ID');
  const { sessionProbe, sessionMutated: recovered } = await recoverEntitledSeedSessionProbe(
    page,
    projectRunId,
  );

  if (sessionProbe.status() !== 200) {
    throw new Error(SEED_AUTH_REUSE_ERROR);
  }

  let sessionMutated = recovered;
  if (!(await hasUiSessionCookie(page))) {
    sessionMutated = (await hydrateUiSession(page)) || sessionMutated;
  }

  expect(
    await hasUiSessionCookie(page),
    'seed session hint cookie must be present when reusing worker auth',
  ).toBe(true);

  return { sessionMutated };
}

export async function ensureSeedAuthSession(page: Page): Promise<void> {
  const projectRunId = required('E2E_SEED_PROJECT_RUN_ID');
  let sessionProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(sessionProbe.status());

  if (sessionProbe.status() === 200) {
    if (!(await hasUiSessionCookie(page))) {
      await hydrateUiSession(page);
    }
    if (await hasUiSessionCookie(page)) {
      return;
    }
    throw new Error(
      'seed API session is entitled but jagalchi-session hint cookie could not be hydrated',
    );
  }

  const needsLogin = sessionProbe.status() !== 200 || !(await hasUiSessionCookie(page));
  if (!needsLogin) {
    return;
  }

  const { email, password, userId } = readSeedAuthCredentials();
  await loginWithSeedUser(page, email, password, userId);
  await hydrateUiSession(page);

  sessionProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(sessionProbe.status());
  expect(sessionProbe.status(), 'seed session must be entitled after login').toBe(200);
  expect(
    await hasUiSessionCookie(page),
    'seed session hint cookie must be present after login',
  ).toBe(true);
}
