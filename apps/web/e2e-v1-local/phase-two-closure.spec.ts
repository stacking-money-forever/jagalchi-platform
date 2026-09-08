import { FIXTURE_JOB_POSTING_URL } from '@jagalchi/api-client';
import type { Page } from '@playwright/test';
import { expect, test } from './phase-two-fixtures';
import { ensureSeedAuthSession } from './auth-bootstrap';
import {
  completeWaveBWizardFromProfileReview,
  ensureSeedSession,
  expectNoServiceWorker,
  focusWorkspaceLocator,
  openWorkspaceSurface,
  openWaveBTargetEntry,
  proofFactsLocator,
  repositoryBindingRegion,
} from './helpers';

type FreshTask = {
  id: string;
  title: string;
  state: string;
  verificationFailure?: { code: string; note: string | null } | null;
};
type FreshProjection = {
  id: string;
  version: number;
  currentTaskId: string | null;
  recommendedTaskId: string | null;
  tasks: FreshTask[];
  repositoryBinding?: {
    githubRepositoryId?: string;
    pullNumber?: number;
  };
  proof: {
    verification: { state: string };
    publication: { state: string };
    facts?: unknown;
  } | null;
  pendingOperation?: { id: string; kind: string } | null;
};

type OperationView = {
  id?: string;
  result?: { resourceId?: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function projection(page: Page, runId: string): Promise<FreshProjection> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await page.request.get(`/api/project-runs/${runId}`);
    if (response.status() === 200) {
      const body = (await response.json()) as FreshProjection;
      expect(body.id).toBe(runId);
      return body;
    }
    expect(response.status()).toBe(429);
    const retryAfterSeconds = Number(response.headers()['retry-after'] ?? '1');
    await page.waitForTimeout(Math.max(1_000, retryAfterSeconds * 1_000));
  }
  throw new Error('Project Run projection remained rate limited after its advertised retry window');
}

async function postBrowserCommand(
  page: Page,
  url: string,
  version: number,
): Promise<{ status: number; body: unknown }> {
  return page.evaluate(
    async ({ commandUrl, expectedVersion }) => {
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'same-origin' });
      const csrf = (await csrfResponse.json()) as { token: string };
      const response = await fetch(commandUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'x-csrf-token': csrf.token,
          'idempotency-key': crypto.randomUUID(),
          'if-match': String(expectedVersion),
        },
      });
      return { status: response.status, body: await response.json() };
    },
    { commandUrl: url, expectedVersion: version },
  );
}

async function postUiCommand(page: Page, urlPart: string, label: string, expectedStatus: number) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(urlPart) && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: label, exact: true }).filter({ visible: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(expectedStatus);
  const body = await response.json();
  expect(body).toBeTruthy();
  return body;
}

async function waitForTaskState(page: Page, runId: string, taskId: string, state: string) {
  await expect
    .poll(
      async () => (await projection(page, runId)).tasks.find((task) => task.id === taskId)?.state,
      { timeout: 180_000 },
    )
    .toBe(state);
}

async function graphGeometry(page: Page) {
  return page.locator('.react-flow__node:visible').evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          id: node.getAttribute('data-id') ?? node.id,
          x: Math.round(rect.x * 100) / 100,
          y: Math.round(rect.y * 100) / 100,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

async function graphEdges(page: Page) {
  return page
    .locator('.react-flow__edge:visible')
    .evaluateAll((edges) => edges.map((edge) => edge.getAttribute('data-id') ?? edge.id).sort());
}

async function selectExplicitTheme(page: Page, theme: 'light' | 'dark') {
  const expectedName = new RegExp(`^${theme === 'light' ? '라이트' : '다크'} 모드 사용 중`);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const selected = page.getByRole('button', { name: expectedName }).filter({ visible: true });
    if (await selected.count()) return;
    const currentTheme = page
      .getByRole('button', {
        name: /^(?:라이트 모드|다크 모드|시스템 설정) 사용 중\./,
      })
      .filter({ visible: true });
    await expect(currentTheme).toBeVisible({ timeout: 10_000 });
    await currentTheme.click();
  }
  throw new Error(`Unable to select explicit ${theme} theme`);
}

async function captureThemeEvidence(
  page: Page,
  runId: string,
  viewport: { width: number; height: number; label: string },
  theme: 'light' | 'dark',
) {
  await page.setViewportSize(viewport);
  await page.goto('/myroadmap');
  await selectExplicitTheme(page, theme);
  await page.goto(`/projects/${runId}`);
  await openWorkspaceSurface(page, 'proof');
  await expect(
    page.getByRole('note', { name: 'fixture 한계' }).filter({ visible: true }),
  ).toContainText('실제 GitHub 검증 또는 공개 증명도 아닙니다.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    viewport.width,
  );
  await page.screenshot({
    path: `test-results/phase2-${viewport.label}-${theme}-proof.png`,
    fullPage: true,
  });

  await page.goto('/myroadmap');
  await expect(page.locator(`a[href^="/projects/${runId}"]`).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    viewport.width,
  );
  await page.screenshot({
    path: `test-results/phase2-${viewport.label}-${theme}-myroadmap.png`,
    fullPage: true,
  });
}

async function bindFixturePullRequest(
  page: Page,
  runId: string,
  repositoryId: string,
  pullRequestNumber: number,
) {
  const bindingRegion = repositoryBindingRegion(page);
  await expect(bindingRegion).toBeVisible();
  const repository = bindingRegion.getByLabel('GitHub 저장소 ID');
  await expect(repository).toBeVisible();
  await repository.fill(repositoryId);
  const pullNumber = bindingRegion.getByLabel('PR 번호');
  await expect(pullNumber).toBeVisible();
  await pullNumber.fill(String(pullRequestNumber));
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/project-runs/${runId}/pull-request`) &&
      response.request().method() === 'POST',
  );
  await bindingRegion.getByRole('button', { name: '프로젝트 실행 PR 저장' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(202);
  const body = (await response.json()) as { id?: string; kind?: string };
  expect(body.id).toMatch(UUID);
  expect(body.kind).toBe('PULL_REQUEST_BINDING');
  await expect
    .poll(async () => (await projection(page, runId)).repositoryBinding?.pullNumber, {
      timeout: 180_000,
    })
    .toBe(pullRequestNumber);
}

test.describe('phase2-closure:complete-journey', () => {
  test('phase2-closure:complete-journey real fresh Wave B Nest journey', async ({
    page,
    browser,
  }) => {
    test.setTimeout(600_000);
    await test.step('phase2-closure:bootstrap E2E_SEED_PROJECT_RUN_ID login only', async () => {
      await ensureSeedSession(page);
      await expectNoServiceWorker(page);
    });

    await test.step('phase2-closure:loading phase2-closure:backend-generated-run-task-id', async () => {
      await openWaveBTargetEntry(page);
      await page.getByRole('textbox').first().fill(FIXTURE_JOB_POSTING_URL);
      const intakeResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/career/target-imports') &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: '공고 가져오기' }).click();
      expect((await intakeResponse).status()).toBe(202);

      const created = await completeWaveBWizardFromProfileReview(page, {
        observeProjectRunLoading: true,
      });
      const operation = created.operation as OperationView;
      expect(operation.id).toMatch(UUID);
      const runId = new URL(page.url()).pathname.split('/').at(-1);
      expect(runId).toMatch(UUID);
      const operationResponse = await page.request.get(`/api/workflow-operations/${operation.id}`);
      expect(operationResponse.status()).toBe(200);
      const operationView = (await operationResponse.json()) as OperationView;
      expect(operationView.result?.resourceId).toBe(runId);
      expect(operationView.result?.resourceId).toMatch(UUID);
      const run = await projection(page, runId!);
      expect(run.id).toBe(runId);
      expect(run.tasks.every((task) => /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(task.id))).toBe(
        true,
      );
      await expectNoServiceWorker(page);
    });

    const runId = () => new URL(page.url()).pathname.split('/').at(-1)!;
    let taskId = '';
    let taskTitle = '';
    let initialVersion = 0;
    let repositoryId = '';
    let beforeGraph: Awaited<ReturnType<typeof graphGeometry>> = [];
    let beforeEdges: string[] = [];

    await test.step('phase2-closure:empty Proof before transition', async () => {
      const run = await projection(page, runId());
      expect(run.proof).toBeNull();
      await openWorkspaceSurface(page, 'proof');
      await expect(
        page.getByRole('region', { name: 'Proof 결과 없음' }).filter({ visible: true }),
      ).toBeVisible();
      await expect(proofFactsLocator(page)).toHaveCount(0);
    });

    await test.step('phase2-closure:new-run-first-task-open recommended Focus', async () => {
      const run = await projection(page, runId());
      expect(run.recommendedTaskId).toEqual(expect.any(String));
      const task = run.tasks.find((item) => item.id === run.recommendedTaskId);
      if (!task) throw new Error('Fresh Nest projection must contain recommendedTaskId');
      taskId = task.id;
      taskTitle = task.title;
      initialVersion = run.version;
      await page.goto(`/projects/${runId()}?task=${encodeURIComponent(taskId)}`);
      await openWorkspaceSurface(page, 'focus');
      await expect(focusWorkspaceLocator(page)).toBeVisible();
      await expect(
        focusWorkspaceLocator(page).getByRole('heading', {
          name: taskTitle,
          level: 2,
          exact: true,
        }),
      ).toBeVisible();
    });

    await test.step('phase2-closure:graph-immutable-before-transition', async () => {
      await openWorkspaceSurface(page, 'map');
      beforeGraph = await graphGeometry(page);
      beforeEdges = await graphEdges(page);
      expect(beforeGraph.length).toBeGreaterThan(0);
      expect(beforeEdges).toEqual(expect.any(Array));
    });

    await test.step('phase2-closure:stale-version real 409 and refetch', async () => {
      const beforeStale = await projection(page, runId());
      expect(beforeStale.tasks.find((task) => task.id === taskId)?.state).toBe('READY');
      expect(beforeStale.version).toBe(initialVersion);
      await openWorkspaceSurface(page, 'focus');
      const external = await postBrowserCommand(
        page,
        `/api/project-runs/${runId()}/tasks/${taskId}/start`,
        initialVersion,
      );
      expect(external.status).toBe(201);

      const staleResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/project-runs/${runId()}/tasks/${taskId}/start`) &&
          response.request().method() === 'POST',
      );
      await focusWorkspaceLocator(page)
        .getByRole('button', { name: '작업 시작', exact: true })
        .click();
      const conflict = await staleResponse;
      expect(conflict.status()).toBe(409);
      const conflictBody = (await conflict.json()) as { code?: unknown; message?: unknown };
      expect(typeof conflictBody.code).toBe('string');
      expect(typeof conflictBody.message).toBe('string');
      await expect(
        page.getByRole('alert').filter({ hasText: '프로젝트 상태가', visible: true }),
      ).toContainText(/갱신되었습니다|다시 시도/);
      await waitForTaskState(page, runId(), taskId, 'IN_PROGRESS');
      expect((await projection(page, runId())).version).toBeGreaterThan(initialVersion);
    });

    await test.step('phase2-closure:blocked through user-visible command', async () => {
      await focusWorkspaceLocator(page)
        .getByRole('textbox', { name: '막힘 기록 메모', exact: true })
        .fill('외부 검토가 필요합니다.');
      await postUiCommand(page, `/tasks/${taskId}/block`, '막힘 기록', 201);
      await waitForTaskState(page, runId(), taskId, 'BLOCKED');
    });

    await test.step('phase2-closure:deterministic-transition resume to IN_PROGRESS', async () => {
      await postUiCommand(page, `/tasks/${taskId}/resume`, '작업 재개', 201);
      await waitForTaskState(page, runId(), taskId, 'IN_PROGRESS');
    });
    await test.step('phase2-closure:refresh-resume same Focus and state', async () => {
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`[?&]task=${taskId}`));
      await openWorkspaceSurface(page, 'focus');
      await expect(
        focusWorkspaceLocator(page).getByRole('heading', {
          name: taskTitle,
          level: 2,
          exact: true,
        }),
      ).toBeVisible();
      expect(
        (await projection(page, runId())).tasks.find((task) => task.id === taskId)?.state,
      ).toBe('IN_PROGRESS');
    });

    await test.step('phase2-closure:rediscover-run-without-browser-state', async () => {
      const createdRunId = runId();
      const freshContext = await browser.newContext({ serviceWorkers: 'block' });
      try {
        const rediscoveryPage = await freshContext.newPage();
        await ensureSeedAuthSession(rediscoveryPage);
        await rediscoveryPage.goto('/myroadmap');
        const resumeLink = rediscoveryPage.locator(`a[href^="/projects/${createdRunId}"]`).first();
        await expect(resumeLink).toBeVisible();
        await resumeLink.click();
        await expect(rediscoveryPage).toHaveURL(new RegExp(`/projects/${createdRunId}`));
        await expectNoServiceWorker(rediscoveryPage);
      } finally {
        await freshContext.close();
      }
    });

    await test.step('phase2-closure:failure-pr-binding-43', async () => {
      await openWorkspaceSurface(page, 'proof');
      const boundRun = await projection(page, runId());
      const githubRepositoryId = (
        boundRun as FreshProjection & {
          repositoryBinding?: { githubRepositoryId?: string };
        }
      ).repositoryBinding?.githubRepositoryId;
      expect(githubRepositoryId).toEqual(expect.any(String));
      repositoryId = githubRepositoryId!;
      await bindFixturePullRequest(page, runId(), repositoryId, 43);
      const bound = await projection(page, runId());
      expect(bound.repositoryBinding?.pullNumber).toBe(43);
    });

    await test.step('phase2-closure:ai-help-provenance', async () => {
      await page.goto(`/projects/${runId()}?task=${encodeURIComponent(taskId)}`);
      await openWorkspaceSurface(page, 'focus');
      const syntheticCanary = process.env.JAGALCHI_E2E_SYNTHETIC_CANARY;
      await focusWorkspaceLocator(page)
        .getByLabel('현재 작업 AI 질문')
        .fill(
          `완료 기준과 검증 근거를 설명해 주세요.${syntheticCanary ? ` ${syntheticCanary}` : ''}`,
        );
      const aiResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/project-runs/${runId()}/tasks/${taskId}/ai-help`) &&
          response.request().method() === 'POST',
      );
      await focusWorkspaceLocator(page)
        .getByRole('button', { name: 'AI 도움 요청', exact: true })
        .click();
      const response = await aiResponse;
      expect(response.status()).toBe(200);
      const body = (await response.json()) as { guidance?: unknown; provenance?: unknown };
      expect(typeof body.guidance).toBe('string');
      expect(body.provenance).toBeTruthy();
      await expect(focusWorkspaceLocator(page).getByText(/^provenance:/)).toBeVisible();
    });

    await test.step('phase2-closure:verification-failure-visible-and-recoverable', async () => {
      await postUiCommand(page, `/tasks/${taskId}/verify`, '결과 확인 요청', 202);
      await waitForTaskState(page, runId(), taskId, 'IN_PROGRESS');
      await expect
        .poll(
          async () =>
            (await projection(page, runId())).tasks.find((task) => task.id === taskId)
              ?.verificationFailure?.code,
          { timeout: 180_000 },
        )
        .toBe('VERIFICATION_FAILED');
      await page.reload();
      await openWorkspaceSurface(page, 'focus');
      await expect(
        focusWorkspaceLocator(page).getByRole('heading', { name: '검증 실패' }),
      ).toBeVisible();
      await expect(focusWorkspaceLocator(page).getByText('VERIFICATION_FAILED')).toBeVisible();
    });

    await test.step('phase2-closure:verification-retry-same-binding-done-proof', async () => {
      const verifyBody = await postUiCommand(
        page,
        `/tasks/${taskId}/verify`,
        '결과 확인 요청',
        202,
      );
      expect(verifyBody).toBeTruthy();
      await expect
        .poll(
          async () =>
            (await projection(page, runId())).tasks.find((task) => task.id === taskId)?.state,
          {
            timeout: 180_000,
          },
        )
        .toBe('DONE');
      await expect.poll(async () => (await projection(page, runId())).proof).not.toBeNull();
      const verified = await projection(page, runId());
      expect(verified.pendingOperation ?? null).toBeNull();
      expect(verified.proof?.verification.state).toBe('PASS');
      await openWorkspaceSurface(page, 'proof');
      await expect(proofFactsLocator(page)).toBeVisible({ timeout: 30_000 });
    });

    await test.step('phase2-closure:publish-active', async () => {
      await postUiCommand(page, `/publish`, '이 실행 발행 요청', 201);
      await expect
        .poll(async () => (await projection(page, runId())).proof?.publication.state)
        .toBe('ACTIVE');
      await expect(
        page
          .getByRole('region', { name: '실행 발행 상태' })
          .filter({ visible: true })
          .getByText('발행됨', { exact: true }),
      ).toBeVisible();
    });

    await test.step('phase2-closure:unpublish-owner-control', async () => {
      await postUiCommand(page, `/unpublish`, '이 실행의 발행 취소', 201);
      await expect
        .poll(async () => (await projection(page, runId())).proof?.publication.state)
        .toBe('UNPUBLISHED');
      await expect(
        page
          .getByRole('region', { name: '실행 발행 상태' })
          .filter({ visible: true })
          .getByText('미발행', { exact: true }),
      ).toBeVisible();
      await postUiCommand(page, `/publish`, '이 실행 발행 요청', 200);
      await expect
        .poll(async () => (await projection(page, runId())).proof?.publication.state)
        .toBe('ACTIVE');
    });

    await test.step('phase2-closure:invalidated-proof after reverify', async () => {
      await postUiCommand(page, `/reverify`, '재검증 요청', 202);
      await expect
        .poll(async () => (await projection(page, runId())).proof?.publication.state, {
          timeout: 180_000,
        })
        .toBe('INVALIDATED');
      await expect(
        page
          .getByRole('region', { name: '실행 발행 상태' })
          .filter({ visible: true })
          .getByText('무효화', { exact: true }),
      ).toBeVisible();
    });

    await test.step('phase2-closure:light-dark-evidence', async () => {
      const createdRunId = runId();
      const originalViewport = page.viewportSize() ?? { width: 1280, height: 720 };
      for (const viewport of [
        { width: 1440, height: 900, label: '1440' },
        { width: 390, height: 844, label: '390' },
      ]) {
        for (const theme of ['light', 'dark'] as const) {
          await captureThemeEvidence(page, createdRunId, viewport, theme);
        }
      }
      await page.setViewportSize(originalViewport);
      await page.goto(`/projects/${createdRunId}`);
    });

    await test.step('phase2-closure:graph-structure-immutability node edge geometry', async () => {
      await openWorkspaceSurface(page, 'map');
      expect(await graphGeometry(page)).toEqual(beforeGraph);
      expect(await graphEdges(page)).toEqual(beforeEdges);
    });

    await test.step('phase2-closure:responsive-1440', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      for (const surface of ['map', 'journey', 'focus', 'proof'] as const) {
        await openWorkspaceSurface(page, surface);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          1440,
        );
      }
    });
    await test.step('phase2-closure:narrow-390 responsive document journey map proof', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openWorkspaceSurface(page, 'journey');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390,
      );
      const mapToggle = page
        .getByRole('button', { name: '여정 지도 펼치기', exact: true })
        .filter({ visible: true });
      await expect(mapToggle).toHaveAttribute('aria-expanded', 'false');
      await openWorkspaceSurface(page, 'map');
      await expect(
        page.getByRole('button', { name: '여정 지도 닫기', exact: true }).filter({ visible: true }),
      ).toHaveAttribute('aria-expanded', 'true');
      for (const surface of ['focus', 'proof'] as const) {
        await openWorkspaceSurface(page, surface);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          390,
        );
      }
    });
    await test.step('phase2-closure:long-korean-overflow', async () => {
      await openWorkspaceSurface(page, 'map');
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    });
    await test.step('phase2-closure:keyboard', async () => {
      await openWorkspaceSurface(page, 'journey');
      const taskChoice = page
        .getByRole('complementary', { name: '프로젝트 여정' })
        .filter({ visible: true })
        .getByRole('button', { name: new RegExp(`^작업 선택: ${escapeRegExp(taskTitle)}`) });
      await taskChoice.focus();
      await page.keyboard.press('Enter');
      await expect(taskChoice).toHaveAttribute('aria-pressed', 'true');
      await expect(
        focusWorkspaceLocator(page).getByRole('heading', { level: 2, name: taskTitle }),
      ).toBeVisible();
    });
    await test.step('phase2-closure:reduced-motion', async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openWorkspaceSurface(page, 'map');
      const moving = await page
        .getByRole('region', { name: '프로젝트 여정 지도' })
        .filter({ visible: true })
        .locator('*:visible')
        .evaluateAll(
          (elements) =>
            elements.filter((element) => {
              const style = getComputedStyle(element);
              const transitionProperties = style.transitionProperty
                .split(',')
                .map((property) => property.trim());
              return (
                style.animationDuration !== '0s' ||
                transitionProperties.some((property) =>
                  ['transform', 'translate', 'rotate', 'scale'].includes(property),
                )
              );
            }).length,
        );
      expect(moving).toBe(0);
    });
    await test.step('phase2-closure:no-service-worker', async () => {
      await expectNoServiceWorker(page);
    });
  });

  test('phase2-closure:error-404-next-home', async ({ page }) => {
    await ensureSeedSession(page);
    const missingId = crypto.randomUUID();
    const apiResponse = await page.request.get(`/api/project-runs/${missingId}`);
    expect(apiResponse.status()).toBe(404);
    const apiBody = (await apiResponse.json()) as { statusCode?: unknown; message?: unknown };
    expect(apiBody.statusCode).toBe(404);
    expect(typeof apiBody.message).toBe('string');
    const pageResponse = await page.goto(`/projects/${missingId}`);
    expect(pageResponse?.status()).toBe(200);
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '프로젝트 실행을 찾을 수 없어요' }),
    ).toBeVisible();
    const homeLink = page.getByRole('link', { name: '홈으로', exact: true });
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL('/');
  });
});
