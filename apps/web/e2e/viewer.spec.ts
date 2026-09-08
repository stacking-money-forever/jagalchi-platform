import { test, expect } from '@playwright/test';

import { loginAsTestUser } from './helpers/auth';

const ROADMAP_ID = '11111111-1111-4111-8111-111111111111';

test.describe('Viewer E2E', () => {
  test('viewer loads the authoritative public roadmap', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/viewer/${ROADMAP_ID}`);

    await expect(page.locator('header')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('프론트엔드 개발자 로드맵', { exact: true })).toBeVisible();
    await expect(page.locator('.react-flow:visible')).toBeVisible({ timeout: 30000 });
    await expect(
      page.locator('.react-flow__node').filter({ hasText: 'HTML/CSS 기초' }),
    ).toBeVisible();
  });
});
