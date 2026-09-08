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
    state: string;
    required: boolean;
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
  await ensureSeedSession(page);
  const runResponse = await page.request.get(`/api/project-runs/${projectRunId}`);
  expect(runResponse.status()).toBe(200);
  const projection = (await runResponse.json()) as ProjectRunProjectionPayload;
  expect(projection.id).toBe(projectRunId);
  return projection;
}

export async function expectProjectRunWorkspaceReady(page: Page, projectRunId: string) {
  await expect(page).toHaveURL(new RegExp(`/projects/${projectRunId}(?:[?#]|$)`));
  await expect(
    page.getByRole('main').filter({ visible: true }).getByRole('heading', { level: 1 }).first(),
  ).toBeVisible();
  await expect(focusWorkspaceLocator(page)).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: '프로젝트 여정' }).filter({ visible: true }),
  ).toBeVisible();
  // Next.js retains the previous route hidden; its pending status is not this route's loader.
  await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0);
}

export async function openProjectRunWorkspace(page: Page, projectRunId: string) {
  await ensureSeedSession(page);
  const pageResponse = await page.goto(`/projects/${projectRunId}`);
  expect(pageResponse?.status()).toBe(200);
  await expectProjectRunWorkspaceReady(page, projectRunId);
  await expectNoServiceWorker(page);
}

export type WorkspaceSurface = 'map' | 'journey' | 'focus' | 'proof';

export async function openWorkspaceSurface(page: Page, surface: WorkspaceSurface) {
  if (surface === 'map') {
    const map = page.getByRole('region', { name: '프로젝트 여정 지도' }).filter({ visible: true });
    if ((await map.count()) === 0) {
      await page
        .getByRole('button', { name: '여정 지도 펼치기', exact: true })
        .filter({ visible: true })
        .click();
    }
    await expect(map).toBeVisible();
    return;
  }
  if (surface === 'journey') {
    await expect(
      page.getByRole('region', { name: '작업 여정' }).filter({ visible: true }),
    ).toBeVisible();
    return;
  }
  if (surface === 'focus') {
    await expect(focusWorkspaceLocator(page)).toBeVisible();
    return;
  }
  const disclosure = page.locator('details:visible').filter({
    has: page.locator('summary', { hasText: '실행 증명과 발행 보기' }),
  });
  if (!(await disclosure.evaluate((element) => element.hasAttribute('open')))) {
    await disclosure.locator('summary').first().click();
  }
  await expect(repositoryBindingRegion(page)).toBeVisible();
}

export function repositoryBindingRegion(page: Page) {
  return page
    .getByRole('region', { name: '프로젝트 실행 PR 바인딩', exact: true })
    .filter({ visible: true });
}

export function repositoryBindingValueLocator(page: Page, repositoryName: string) {
  return repositoryBindingRegion(page).getByText(repositoryName, { exact: false }).first();
}

export async function expectRepositoryBindingName(page: Page, repositoryName: string) {
  await expect(repositoryBindingValueLocator(page, repositoryName)).toBeVisible();
}

export function focusWorkspaceLocator(page: Page) {
  return page.getByRole('article', { name: '현재 작업 문서' }).filter({ visible: true });
}

export function proofFactsLocator(page: Page) {
  return page
    .getByRole('region', { name: '검증 조건과 출처', exact: true })
    .filter({ visible: true });
}

export function proofSummaryLocator(page: Page) {
  return page
    .getByRole('region', { name: '실행 결과 요약', exact: true })
    .filter({ visible: true });
}

export async function expectFocusCitationLabel(page: Page, label: string) {
  await expect(
    focusWorkspaceLocator(page)
      .getByRole('heading', { name: '인용된 채용 요구사항' })
      .locator('xpath=following-sibling::ul[1]')
      .getByText(label, { exact: true }),
  ).toBeVisible();
}

export async function expectFocusGapDescription(page: Page, description: string) {
  await expect(
    focusWorkspaceLocator(page)
      .getByRole('heading', { name: '커리어 갭' })
      .locator('xpath=following-sibling::ul[1]')
      .getByText(description, { exact: true }),
  ).toBeVisible();
}

export async function expectFocusWorkspaceReady(page: Page, anchorTaskTitle: string) {
  const focus = focusWorkspaceLocator(page);
  await expect(focus).toBeVisible();
  await expect(focus.getByRole('heading', { level: 2, name: anchorTaskTitle })).toBeVisible();
}

export async function expectProofSurfaceReady(
  page: Page,
  projection: Pick<ProjectRunProjectionPayload, 'proof'>,
) {
  await expect(repositoryBindingRegion(page)).toBeVisible();

  if (!projection.proof) {
    await expect(
      page.getByRole('region', { name: 'Proof 결과 없음' }).filter({ visible: true }),
    ).toBeVisible();
    return;
  }

  await expect(proofSummaryLocator(page)).toBeVisible();
  await expect(proofFactsLocator(page)).toBeVisible();
}

export function verificationStateLabelKo(state: 'PENDING' | 'PASS' | 'FAIL' | 'STALE'): string {
  switch (state) {
    case 'PASS':
      return '통과';
    case 'PENDING':
      return '대기';
    case 'FAIL':
      return '실패';
    case 'STALE':
      return '만료';
    default:
      return state;
  }
}

export async function expectProofVerificationState(
  page: Page,
  state: 'PENDING' | 'PASS' | 'FAIL' | 'STALE',
) {
  await expect(
    proofSummaryLocator(page).getByText(verificationStateLabelKo(state), { exact: true }),
  ).toBeVisible();
}

export async function expectProofWorkspaceReady(
  page: Page,
  projection: Pick<ProjectRunProjectionPayload, 'proof' | 'repositoryBinding'>,
) {
  await expectProofSurfaceReady(page, projection);

  if (projection.repositoryBinding?.repositoryName) {
    await expectRepositoryBindingName(page, projection.repositoryBinding.repositoryName);
  } else {
    await expect(
      repositoryBindingRegion(page).getByText('저장소 바인딩 정보가 없습니다', { exact: false }),
    ).toBeVisible();
  }
}

export async function ensureSeedSession(page: Page): Promise<void> {
  const { reuseSeedAuthSession } = await import('./auth-bootstrap');
  const { persistSeedAuthStorage } = await import('./seed-auth-storage');
  const { sessionMutated } = await reuseSeedAuthSession(page);
  if (sessionMutated) {
    await persistSeedAuthStorage(page);
  }
}

export async function prepareAuthenticatedTestPage(page: Page) {
  await ensureSeedSession(page);
  await page.goto('/');
  await expectNoServiceWorker(page);
}

export async function openWaveBTargetEntry(page: Page) {
  await ensureSeedSession(page);
  await page.goto('/projects/new');
  await expectNoServiceWorker(page);
  await expect(page.getByRole('heading', { name: '새 프로젝트 시작' })).toBeVisible();
}

export const WAVE_B_FIXTURE_REPOSITORY_LABEL = 'fixture/verification-repository';

export async function selectWaveBExistingRepository(
  page: Page,
  repositoryLabel = WAVE_B_FIXTURE_REPOSITORY_LABEL,
) {
  await expect(page.getByRole('heading', { name: '저장소 연결' })).toBeVisible();
  const existingOwnedMode = page.getByRole('button', { name: '기존 저장소' });
  if (await existingOwnedMode.isVisible()) {
    await existingOwnedMode.click();
  }

  const repoSelect = page.getByLabel('GitHub 저장소');
  await expect(repoSelect).toBeVisible();
  const fixtureOption = repoSelect.locator('option', { hasText: repositoryLabel });
  await expect(fixtureOption).toHaveCount(1);
  const repositoryId = await fixtureOption.getAttribute('value');
  expect(repositoryId, 'fixture repository option must expose a repository id').toBeTruthy();
  await repoSelect.selectOption({ label: repositoryLabel });
  await expect(repoSelect).toHaveValue(repositoryId!);

  const continueButton = page.getByRole('button', { name: '시작 내용 확인' });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  return repositoryId!;
}

export async function completeWaveBWizardFromProfileReview(
  page: Page,
  options: { observeProjectRunLoading?: boolean } = {},
) {
  await ensureSeedSession(page);
  await expect(page.getByRole('heading', { name: '로그인이 필요합니다' })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: '가져온 작업 정보 확인' })).toBeVisible({
    timeout: 180_000,
  });
  await page.getByRole('button', { name: '이 내용으로 계속' }).click();

  await expect(page.getByRole('heading', { name: '준비 상태 확인' })).toBeVisible({
    timeout: 120_000,
  });
  await page.getByRole('button', { name: '이 내용으로 계속' }).click();

  await expect(page.getByRole('button', { name: '이 제안 선택' }).first()).toBeVisible({
    timeout: 180_000,
  });
  await page.getByRole('button', { name: '이 제안 선택' }).first().click();
  await page.getByRole('button', { name: '저장소 연결로 계속' }).click();

  const repositoryId = await selectWaveBExistingRepository(page);

  await expect(page.getByRole('heading', { name: '시작 내용 확인' })).toBeVisible();
  const projectRunResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/project-run-operations') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '프로젝트 시작' }).click();
  if (options.observeProjectRunLoading) {
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  }
  const response = await projectRunResponse;
  expect(response.status()).toBe(202);
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/i, { timeout: 180_000 });
  await expectProjectRunWorkspaceReady(page, new URL(page.url()).pathname.split('/').at(-1)!);
  await expectNoServiceWorker(page);
  return { repositoryId, operation: await response.json() };
}
