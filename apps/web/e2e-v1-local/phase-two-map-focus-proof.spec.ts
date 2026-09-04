import { expect, test } from './phase-two-fixtures';

import {
  expectFocusCitationLabel,
  expectFocusGapDescription,
  expectProofVerificationState,
  expectRepositoryBindingName,
  fetchProjectRun,
  focusWorkspaceLocator,
  openProjectRunWorkspace,
  prepareAuthenticatedTestPage,
  proofFactsLocator,
  repositoryBindingRegion,
  required,
  selectWorkspaceTab,
} from './helpers';

const projectRunId = required('E2E_SEED_PROJECT_RUN_ID');

function focusAnchorTaskId(projection: Awaited<ReturnType<typeof fetchProjectRun>>) {
  return projection.currentTaskId ?? projection.recommendedTaskId;
}

test.describe('Phase 2 Wave A project run surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await prepareAuthenticatedTestPage(page);
  });

  test('Map loads Nest milestones and tasks as a read-only graph', async ({ page }) => {
    const projection = await fetchProjectRun(page, projectRunId);
    await openProjectRunWorkspace(page, projectRunId);

    await expect(page.getByRole('heading', { name: '실행 로드맵 지도' })).toBeVisible();
    await expect(page.locator('[data-exemplar-canvas] .react-flow__node').first()).toBeVisible();

    const milestoneTitle =
      projection.milestones?.[0]?.title ??
      projection.map.nodes.find((node) => node.milestoneId)?.title;
    expect(milestoneTitle).toBeTruthy();
    await expect(page.getByText(milestoneTitle!, { exact: false }).first()).toBeVisible();

    const sampleTask = projection.tasks[0];
    expect(sampleTask).toBeTruthy();
    await expect(page.getByText(sampleTask!.title, { exact: false }).first()).toBeVisible();

    const readOnly = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll('[data-exemplar-canvas] .react-flow__node'),
      );
      return nodes.length > 0 && nodes.every((node) => node.classList.contains('nodrag'));
    });
    expect(readOnly).toBe(true);
  });

  test('Focus shows current or recommended task with citations, gaps, and evidence', async ({
    page,
  }) => {
    const projection = await fetchProjectRun(page, projectRunId);
    const anchorId = focusAnchorTaskId(projection);
    expect(anchorId).toBeTruthy();

    const anchorTask = projection.tasks.find((task) => task.id === anchorId);
    expect(anchorTask).toBeTruthy();

    await openProjectRunWorkspace(page, projectRunId);
    await selectWorkspaceTab(page, '포커스');

    await expect(page.locator('section[aria-label="포커스 작업"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: anchorTask!.title })).toBeVisible();

    const citationId = anchorTask!.citationIds?.[0];
    if (citationId) {
      const citation = projection.citations?.find((item) => item.id === citationId);
      expect(citation).toBeTruthy();
      await expectFocusCitationLabel(page, citation!.label);
    } else {
      await expect(focusWorkspaceLocator(page).getByText('연결된 인용이 없습니다.')).toBeVisible();
    }

    const gapId = anchorTask!.gapIds?.[0];
    if (gapId) {
      const gap = projection.gaps?.find((item) => item.id === gapId);
      expect(gap).toBeTruthy();
      await expectFocusGapDescription(page, gap!.description);
    } else {
      await expect(focusWorkspaceLocator(page).getByText('연결된 갭이 없습니다.')).toBeVisible();
    }

    if (anchorTask!.evidenceRequirements.length > 0) {
      await expect(page.getByRole('heading', { name: '증거 요건' })).toBeVisible();
    }
  });

  test('Proof shows repository and check facts or explicit unmet state', async ({ page }) => {
    const projection = await fetchProjectRun(page, projectRunId);
    await openProjectRunWorkspace(page, projectRunId);
    await selectWorkspaceTab(page, 'Proof');

    await expect(repositoryBindingRegion(page)).toBeVisible();

    if (projection.repositoryBinding?.repositoryName) {
      await expectRepositoryBindingName(page, projection.repositoryBinding.repositoryName);
    } else {
      await expect(
        repositoryBindingRegion(page).getByText('바인딩 정보가 없습니다.'),
      ).toBeVisible();
    }

    if (!projection.proof) {
      await expect(page.getByText('Proof 데이터가 아직 없습니다.')).toBeVisible();
      return;
    }

    await expectProofVerificationState(
      page,
      projection.proof.verification.state as 'PENDING' | 'PASS' | 'FAIL' | 'STALE',
    );

    const failed = projection.proof.failedCriteria ?? [];
    const evaluations = projection.proof.facts?.evaluations ?? [];
    if (failed.length > 0) {
      await expect(
        proofFactsLocator(page).getByRole('heading', { name: '실패한 기준' }),
      ).toBeVisible();
      await expect(proofFactsLocator(page).getByText(failed[0]!.ruleId)).toBeVisible();
    } else if (evaluations.length > 0) {
      await expect(
        proofFactsLocator(page).getByRole('heading', { name: '규칙별 결과' }),
      ).toBeVisible();
      const first = evaluations[0]!;
      await expect(
        proofFactsLocator(page)
          .getByText(first.passed ? '통과' : '실패')
          .first(),
      ).toBeVisible();
    } else {
      await expect(
        proofFactsLocator(page).getByText('기계 검증 사실이 아직 없습니다.'),
      ).toBeVisible();
    }
  });

  test('refresh keeps the current Focus task from Nest projection', async ({ page }) => {
    const projection = await fetchProjectRun(page, projectRunId);
    const anchorId = focusAnchorTaskId(projection);
    const anchorTask = projection.tasks.find((task) => task.id === anchorId);
    expect(anchorTask).toBeTruthy();

    await openProjectRunWorkspace(page, projectRunId);
    await selectWorkspaceTab(page, '포커스');
    await expect(page.getByRole('heading', { level: 2, name: anchorTask!.title })).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole('heading', { name: `프로젝트 실행 ${projectRunId.slice(0, 8)}` }),
    ).toBeVisible();

    await selectWorkspaceTab(page, '포커스');
    await expect(page.getByRole('heading', { level: 2, name: anchorTask!.title })).toBeVisible();
    await expect(
      focusWorkspaceLocator(page).locator('header').getByText(anchorId!, { exact: true }),
    ).toBeVisible();
  });
});
