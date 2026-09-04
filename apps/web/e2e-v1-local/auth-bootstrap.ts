import { expect, type APIResponse, type Page } from '@playwright/test';

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

const E2E_BASE_ORIGIN = new URL(process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100').origin;
const SESSION_COOKIE_KEY = 'jagalchi-session';

async function hasUiSessionCookie(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some((cookie) => cookie.name === SESSION_COOKIE_KEY && cookie.value === '1');
}

async function ensureBaseOrigin(page: Page): Promise<void> {
  let currentOrigin: string | undefined;
  try {
    currentOrigin = new URL(page.url()).origin;
  } catch {
    currentOrigin = undefined;
  }

  if (currentOrigin !== E2E_BASE_ORIGIN) {
    await page.goto(`${E2E_BASE_ORIGIN}/`);
  }
}

async function refreshSessionHint(page: Page): Promise<boolean> {
  await ensureBaseOrigin(page);

  let refreshResult: { stage: 'csrf' | 'refresh'; status: number };
  try {
    refreshResult = await page.evaluate(async () => {
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'same-origin',
      });
      if (!csrfResponse.ok) {
        return { stage: 'csrf' as const, status: csrfResponse.status };
      }

      const body = (await csrfResponse.json().catch(() => undefined)) as
        { token?: unknown } | undefined;
      if (typeof body?.token !== 'string' || body.token.length === 0) {
        return { stage: 'csrf' as const, status: csrfResponse.status };
      }

      const refreshResponse = await fetch('/api/users/auth/refresh', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'X-CSRF-Token': body.token,
        },
      });
      return { stage: 'refresh' as const, status: refreshResponse.status };
    });
  } catch {
    return false;
  }

  assertProbeNotRateLimited(refreshResult.status);
  if (refreshResult.stage !== 'refresh' || refreshResult.status !== 200) {
    return false;
  }
  return hasUiSessionCookie(page);
}

/** @returns true when one browser refresh or navigation established the UI session hint cookie */
export async function hydrateUiSession(page: Page): Promise<boolean> {
  if (await hasUiSessionCookie(page)) {
    return false;
  }

  return refreshSessionHint(page);
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
  sessionProbe: APIResponse;
  sessionMutated: boolean;
  recoveryAttempted: boolean;
}> {
  let sessionProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(sessionProbe.status());
  if (sessionProbe.status() === 200) {
    return { sessionProbe, sessionMutated: false, recoveryAttempted: false };
  }

  const sessionMutated = await refreshSessionHint(page);
  sessionProbe = await probeEntitledSeedSession(page, projectRunId);
  assertProbeNotRateLimited(sessionProbe.status());
  return { sessionProbe, sessionMutated, recoveryAttempted: true };
}

export async function reuseSeedAuthSession(page: Page): Promise<ReuseSeedAuthSessionResult> {
  const projectRunId = required('E2E_SEED_PROJECT_RUN_ID');
  const {
    sessionProbe,
    sessionMutated: recovered,
    recoveryAttempted,
  } = await recoverEntitledSeedSessionProbe(page, projectRunId);

  if (sessionProbe.status() !== 200) {
    throw new Error(SEED_AUTH_REUSE_ERROR);
  }

  let sessionMutated = recovered;
  if (!(await hasUiSessionCookie(page)) && !recoveryAttempted) {
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
