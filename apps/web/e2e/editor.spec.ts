import { test, expect } from '@playwright/test';

import { loginAsTestUser } from './helpers/auth';

// MSW fixture에 있는 로드맵 ID 사용
const TEST_ROADMAP_ID = '11111111-1111-4111-8111-111111111111';

test.describe('Editor E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/editor/${TEST_ROADMAP_ID}`);
  });

  test('editor page loads and canvas renders', async ({ page }) => {
    await page.waitForSelector('.react-flow', { timeout: 30000 });
    const canvas = page.locator('.react-flow:visible');
    await expect(canvas).toBeVisible();
  });

  test('node can be added via toolbar', async ({ page }) => {
    await page.waitForSelector('.react-flow', { timeout: 30000 });
    const initialNodes = await page.locator('.react-flow__node').count();
    await page.getByTestId('toolbar-add-node').click();
    await expect(page.locator('.react-flow__node')).toHaveCount(initialNodes + 1);
  });

  test.fixme('node selection shows properties panel', async ({ page }) => {
    await page.waitForSelector('.react-flow', { timeout: 30000 });
    const nodes = page.locator('.react-flow__node');
    const initialCount = await nodes.count();

    // Add a new node
    await page.getByTestId('toolbar-add-node').click();
    await expect(nodes).toHaveCount(initialCount + 1, { timeout: 5000 });

    // Click the last added node via bounding box
    const lastNode = nodes.nth(initialCount);
    await lastNode.waitFor({ state: 'visible', timeout: 5000 });
    const box = await lastNode.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await expect(page.getByTestId('properties-panel-header')).toBeVisible({ timeout: 10000 });
  });

  test('node edits are auto-saved and visible in viewer', async ({ page }) => {
    const roadmapId = TEST_ROADMAP_ID;

    await page.waitForSelector('.react-flow', { timeout: 30000 });
    const nodes = page.locator('.react-flow__node');
    const initialNodeCount = await nodes.count();

    await page.getByTestId('toolbar-add-node').click();
    await expect(nodes).toHaveCount(initialNodeCount + 1, { timeout: 10000 });

    const addedNode = nodes.nth(initialNodeCount);
    await addedNode.waitFor({ state: 'visible', timeout: 10000 });
    const box = await addedNode.boundingBox();
    if (!box) {
      throw new Error('Added node is not clickable');
    }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const nameInput = page.getByLabel('단계 이름');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill('수정된 E2E 노드');

    const persistedEdit = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes(`/api/roadmaps/${roadmapId}`),
      { timeout: 15000 },
    );
    const descriptionInput = page.getByLabel('완료 조건');
    await descriptionInput.fill('뷰어 저장 확인용 설명');

    await expect(
      page.locator('.react-flow__node').filter({ hasText: '수정된 E2E 노드' }),
    ).toBeVisible({
      timeout: 10000,
    });

    const saveResponse = await persistedEdit;
    expect(saveResponse.ok()).toBe(true);

    await page.getByRole('button', { name: '뷰어 미리보기' }).click();
    await expect(page).toHaveURL(new RegExp(`/viewer/${roadmapId}$`), { timeout: 10000 });
    await expect(
      page.locator('.react-flow__node').filter({ hasText: '수정된 E2E 노드' }),
    ).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('complementary').getByText('뷰어 저장 확인용 설명')).toBeVisible();
  });

  test('share button opens viewer for roadmap', async ({ page }) => {
    await page.waitForSelector('.react-flow', { timeout: 30000 });
    await page.getByRole('button', { name: '뷰어 미리보기' }).click();
    await expect(page).toHaveURL(new RegExp(`/viewer/${TEST_ROADMAP_ID}$`), {
      timeout: 10000,
    });
    await expect(page.locator('header:visible')).toBeVisible({ timeout: 15000 });
  });

  // Ctrl+Z undo는 unit test (use-keyboard-shortcuts.test.ts)에서 커버.
  // headless Chromium에서 React Flow 키보드 이벤트가 동작하지 않아 E2E 제외.
});
