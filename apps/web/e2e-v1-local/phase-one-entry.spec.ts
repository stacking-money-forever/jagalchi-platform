import { expect, test } from '@playwright/test';

import { ensureSeedAuthSession } from './auth-bootstrap';
import { expectNoServiceWorker, required } from './helpers';

const projectRunId = required('E2E_SEED_PROJECT_RUN_ID');
const roadmapId = required('E2E_SEED_ROADMAP_ID');

test('seeded user enters a real project run without MSW', async ({ page }) => {
  await ensureSeedAuthSession(page);
  await page.goto('/');
  await expectNoServiceWorker(page);

  const runResponse = await page.request.get(`/api/project-runs/${projectRunId}`);
  expect(runResponse.status()).toBe(200);
  expect((await runResponse.json()).id).toBe(projectRunId);

  const roadmapResponse = await page.request.get(`/api/roadmaps/${roadmapId}`);
  expect(roadmapResponse.status()).toBe(200);
  expect((await roadmapResponse.json()).id).toBe(roadmapId);

  const pageResponse = await page.goto(`/projects/${projectRunId}`);
  expect(pageResponse?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: `프로젝트 실행 ${projectRunId.slice(0, 8)}` }),
  ).toBeVisible();
  await expectNoServiceWorker(page);
});
