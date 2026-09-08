import { expect, test } from './phase-two-fixtures';

import {
  expectFocusCitationLabel,
  expectFocusGapDescription,
  expectFocusWorkspaceReady,
  expectProofVerificationState,
  expectProofWorkspaceReady,
  expectProjectRunWorkspaceReady,
  fetchProjectRun,
  focusWorkspaceLocator,
  openWorkspaceSurface,
  openProjectRunWorkspace,
  prepareAuthenticatedTestPage,
  proofFactsLocator,
  required,
} from './helpers';

const projectRunId = required('E2E_SEED_PROJECT_RUN_ID');

function focusAnchorTaskId(projection: Awaited<ReturnType<typeof fetchProjectRun>>) {
  return projection.currentTaskId ?? projection.recommendedTaskId ?? projection.tasks[0]?.id;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('Phase 2 Wave A project run surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await prepareAuthenticatedTestPage(page);
  });

  test('Map loads Nest milestones and tasks as a read-only graph', async ({ page }) => {
    const projection = await fetchProjectRun(page, projectRunId);
    await openProjectRunWorkspace(page, projectRunId);
    await openWorkspaceSurface(page, 'map');

    const map = page.getByRole('region', { name: '프로젝트 여정 지도' }).filter({ visible: true });
    await expect(map).toBeVisible();
    await expect(
      map.locator('[aria-label="작업 선행 관계 지도"] .react-flow__node').first(),
    ).toBeVisible();

    const milestoneTitle =
      projection.milestones?.[0]?.title ??
      projection.map.nodes.find((node) => node.milestoneId)?.title;
    expect(milestoneTitle).toBeTruthy();
    await expect(map.getByText(milestoneTitle!, { exact: false }).first()).toBeVisible();

    const sampleTask = projection.tasks[0];
    expect(sampleTask).toBeTruthy();
    await expect(map.getByText(sampleTask!.title, { exact: false }).first()).toBeVisible();

    await expect(map.getByRole('button', { name: '현재 작업' })).toBeVisible();
    await expect(map.getByRole('button', { name: '전체 보기' })).toBeVisible();

    const taskNode = map.locator('button[data-journey-task-id]').first();
    await expect(taskNode).toHaveClass(/nodrag/);
    const before = await taskNode.boundingBox();
    expect(before).toBeTruthy();
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2 + 80, before!.y + before!.height / 2 + 60, {
      steps: 5,
    });
    await page.mouse.up();
    const after = await taskNode.boundingBox();
    expect(after).toBeTruthy();
    expect(Math.round(after!.x)).toBe(Math.round(before!.x));
    expect(Math.round(after!.y)).toBe(Math.round(before!.y));
  });

  test('Focus shows current or recommended task with citations, gaps, and evidence', async ({
    page,
  }) => {
    const projection = await fetchProjectRun(page, projectRunId);
    const anchorId = focusAnchorTaskId(projection);
    expect(anchorId).toBeTruthy();

    const anchorTask = projection.tasks.find((task) => task.id === anchorId);
    expect(anchorTask).toBeTruthy();

    await page.goto(`/projects/${projectRunId}?task=${encodeURIComponent(anchorId!)}`);
    await expectFocusWorkspaceReady(page, anchorTask!.title);

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

    await expect(
      focusWorkspaceLocator(page).getByRole('heading', { name: '필요한 증거' }),
    ).toBeVisible();

    const journey = page
      .getByRole('complementary', { name: '프로젝트 여정' })
      .filter({ visible: true });
    if (projection.currentTaskId) {
      const currentTask = projection.tasks.find((task) => task.id === projection.currentTaskId);
      expect(currentTask).toBeTruthy();
      await expect(
        journey.getByRole('button', {
          name: new RegExp(`작업 선택: ${escapeRegExp(currentTask!.title)}.*현재 작업`),
        }),
      ).toBeVisible();
    }
    if (projection.recommendedTaskId) {
      const recommendedTask = projection.tasks.find(
        (task) => task.id === projection.recommendedTaskId,
      );
      expect(recommendedTask).toBeTruthy();
      const recommendedButton = journey.getByRole('button', {
        name: new RegExp(`작업 선택: ${escapeRegExp(recommendedTask!.title)}.*상태 시작 가능`),
      });
      await expect(recommendedButton).toBeVisible();
      if (projection.currentTaskId && projection.currentTaskId !== projection.recommendedTaskId) {
        await recommendedButton.click();
        await expectFocusWorkspaceReady(page, recommendedTask!.title);
        await expect(focusWorkspaceLocator(page).getByText('다음 추천 작업')).toBeVisible();
        await expect(
          focusWorkspaceLocator(page).getByText(/다른 현재 작업이 진행 중/),
        ).toBeVisible();
        await expect(
          focusWorkspaceLocator(page).getByRole('button', { name: '작업 시작' }),
        ).toHaveCount(0);
      } else if (!projection.currentTaskId) {
        await recommendedButton.click();
        await expect(focusWorkspaceLocator(page).getByText('다음 추천 작업')).toBeVisible();
        await expect(
          focusWorkspaceLocator(page).getByRole('button', { name: '작업 시작' }),
        ).toBeVisible();
      }
    }
  });

  test('Proof shows repository, verification facts, and publication state in the disclosure', async ({
    page,
  }) => {
    const projection = await fetchProjectRun(page, projectRunId);
    await openProjectRunWorkspace(page, projectRunId);
    await expect(focusWorkspaceLocator(page)).toBeVisible();
    await openWorkspaceSurface(page, 'proof');
    await expectProofWorkspaceReady(page, projection);

    if (!projection.proof) return;

    await expectProofVerificationState(
      page,
      projection.proof.verification.state as 'PENDING' | 'PASS' | 'FAIL' | 'STALE',
    );
    const publicationLabel = (
      {
        ACTIVE: '발행됨',
        UNPUBLISHED: '미발행',
        INVALIDATED: '무효화',
      } as const
    )[projection.proof.publication.state as 'ACTIVE' | 'UNPUBLISHED' | 'INVALIDATED'];
    expect(publicationLabel).toBeTruthy();
    await expect(
      page
        .getByRole('region', { name: '실행 발행 상태' })
        .filter({ visible: true })
        .getByText(publicationLabel!, { exact: true }),
    ).toBeVisible();

    const facts = projection.proof.facts;
    if (!facts) {
      await expect(
        proofFactsLocator(page).getByText('기계 검증 사실이 아직 기록되지 않았습니다.'),
      ).toBeVisible();
      return;
    }

    const evaluations = proofFactsLocator(page).getByRole('list', { name: '검증 조건 결과' });
    await expect(evaluations.getByRole('listitem')).toHaveCount(facts.evaluations.length);
    for (const [index, evaluation] of facts.evaluations.entries()) {
      await expect(
        evaluations
          .getByRole('listitem')
          .nth(index)
          .getByText(evaluation.passed ? '통과' : '보완 필요', { exact: true }),
      ).toBeVisible();
    }

    const technicalDetails = proofFactsLocator(page).locator('details');
    await technicalDetails.locator('summary').click();
    await expect(technicalDetails.getByText(facts.snapshotId, { exact: true })).toBeVisible();
    await expect(
      technicalDetails.getByText(`#${facts.pullNumber}`, { exact: false }),
    ).toBeVisible();
  });

  test('refresh keeps the current Focus task from Nest projection', async ({ page }) => {
    const projection = await fetchProjectRun(page, projectRunId);
    const anchorId = focusAnchorTaskId(projection);
    const anchorTask = projection.tasks.find((task) => task.id === anchorId);
    expect(anchorTask).toBeTruthy();

    await page.goto(`/projects/${projectRunId}?task=${encodeURIComponent(anchorId!)}`);
    await expect(
      focusWorkspaceLocator(page).getByRole('heading', { level: 2, name: anchorTask!.title }),
    ).toBeVisible();

    await page.reload();
    await expectProjectRunWorkspaceReady(page, projectRunId);

    await expect(
      focusWorkspaceLocator(page).getByRole('heading', { level: 2, name: anchorTask!.title }),
    ).toBeVisible();
  });
});
