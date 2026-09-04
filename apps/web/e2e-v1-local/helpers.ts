import { expect, type Page } from '@playwright/test';

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the no-MSW local E2E project`);
  return value;
}

export async function expectNoServiceWorker(page: Page) {
  const state = await page.evaluate(async () => ({
    controlled: Boolean(navigator.serviceWorker?.controller),
    registrations: navigator.serviceWorker
      ? (await navigator.serviceWorker.getRegistrations()).length
      : 0,
  }));
  expect(state).toEqual({ controlled: false, registrations: 0 });
}

export async function loginWithSeedUser(
  page: Page,
  email: string,
  password: string,
  userId: string,
) {
  await page.goto('/login');
  await expectNoServiceWorker(page);

  await page.getByPlaceholder('이메일 입력').fill(email);
  await page.getByPlaceholder('비밀번호 입력').fill(password);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/users/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  const completedLogin = await loginResponse;
  if (completedLogin.status() === 429) {
    throw new Error('seed login was rate limited; refusing blind retry');
  }
  expect(completedLogin.status()).toBe(200);
  expect((await completedLogin.json()).user.id).toBe(userId);
  await expect(page).toHaveURL(/\/$/);
}

export type ProjectRunProjectionPayload = {
  id: string;
  currentTaskId: string | null;
  recommendedTaskId: string | null;
  milestones?: Array<{ id: string; title: string }>;
  map: { nodes: Array<{ id: string; title: string; milestoneId: string | null; state: string }> };
  tasks: Array<{
    id: string;
    title: string;
    citationIds?: string[];
    gapIds?: string[];
    evidenceRequirements: string[];
  }>;
  citations?: Array<{ id: string; label: string; quote?: string }>;
  gaps?: Array<{ id: string; description: string }>;
  repositoryBinding?: {
    repositoryName?: string | null;
    pullNumber?: number | null;
    headSha?: string | null;
    pullUrl?: string | null;
  };
  proof: {
    summary: string;
    verification: { state: string };
    publication: { state: string };
    failedCriteria?: Array<{ ruleId: string; type: string; code: string }>;
    facts?: {
      snapshotId: string;
      pullNumber: number;
      headSha: string;
      evaluations: Array<{ ruleId: string; passed: boolean; code: string }>;
    };
  } | null;
};

export async function fetchProjectRun(
  page: Page,
  projectRunId: string,
): Promise<ProjectRunProjectionPayload> {
  const runResponse = await page.request.get(`/api/project-runs/${projectRunId}`);
  expect(runResponse.status()).toBe(200);
  const projection = (await runResponse.json()) as ProjectRunProjectionPayload;
  expect(projection.id).toBe(projectRunId);
  return projection;
}

export async function openProjectRunWorkspace(page: Page, projectRunId: string) {
  const pageResponse = await page.goto(`/projects/${projectRunId}`);
  expect(pageResponse?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: `프로젝트 실행 ${projectRunId.slice(0, 8)}` }),
  ).toBeVisible();
  await expectNoServiceWorker(page);
}

export async function selectWorkspaceTab(page: Page, label: '지도' | '포커스' | 'Proof') {
  await page.getByRole('tab', { name: label }).click();
  await expect(page.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
}

export function repositoryBindingValueLocator(page: Page, repositoryName: string) {
  return page
    .getByLabel('저장소 바인딩')
    .getByRole('definition', { name: repositoryName, exact: true });
}

export async function expectRepositoryBindingName(page: Page, repositoryName: string) {
  await expect(repositoryBindingValueLocator(page, repositoryName)).toBeVisible();
}

export async function ensureSeedSession(page: Page): Promise<void> {
  const { ensureSeedAuthSession } = await import('./auth-bootstrap');
  await ensureSeedAuthSession(page);
}

export async function prepareAuthenticatedTestPage(page: Page) {
  await page.goto('/');
  await expectNoServiceWorker(page);
}

export async function openWaveBTargetEntry(page: Page) {
  await page.goto('/projects/new');
  await expectNoServiceWorker(page);
  await expect(page.getByText('목표 공고 → 프로젝트 실행')).toBeVisible();
}

export async function completeWaveBWizardFromProfileReview(page: Page) {
  await expect(page.getByRole('heading', { name: 'GitHub 증거 스냅샷 검토' })).toBeVisible({
    timeout: 180_000,
  });
  await page.getByRole('button', { name: '증거 스냅샷 확인' }).click();

  await expect(page.getByRole('heading', { name: 'Career Diff 검토' })).toBeVisible({
    timeout: 120_000,
  });
  await page.getByRole('button', { name: 'Career Diff 확인' }).click();

  await expect(page.getByRole('button', { name: '이 제안 선택' }).first()).toBeVisible({
    timeout: 180_000,
  });
  await page.getByRole('button', { name: '이 제안 선택' }).first().click();
  await page.getByRole('button', { name: '저장소 연결로 계속' }).click();

  const repoSelect = page.locator('select').first();
  if (await repoSelect.isVisible()) {
    const options = repoSelect.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);
    await repoSelect.selectOption({ index: 1 });
  }

  await page.getByRole('button', { name: '범위 확인으로 계속' }).click();
  await page.getByRole('button', { name: '프로젝트 실행 만들기' }).click();

  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/i, { timeout: 180_000 });
  await expect(page.getByRole('tab', { name: '지도' })).toBeVisible();
  await expectNoServiceWorker(page);
}
