import { test, expect } from '@playwright/test';

import { loginAsTestUser } from './helpers/auth';

const FRONTEND_ROADMAP_ID = '11111111-1111-4111-8111-111111111111';
const BACKEND_ROADMAP_ID = '22222222-2222-4222-8222-222222222222';
const MISSING_ROADMAP_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

test.describe('Community E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test.describe('Community List Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/community');
      await expect(page.locator('a[href^="/community/"]').first()).toBeVisible({ timeout: 30000 });
    });

    test('community page loads and shows roadmap list', async ({ page }) => {
      const cards = page.locator('a[href^="/community/"]');
      await expect(cards.first()).toBeVisible();
      expect(await cards.count()).toBeGreaterThan(0);
      await expect(cards.first()).toContainText('프론트엔드 개발자 로드맵');
    });

    test('filter and sort controls are visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: '인기' })).toBeVisible();
      await expect(page.getByRole('button', { name: '최신' })).toBeVisible();
      await expect(page.getByRole('button', { name: '저장한 과제' })).toBeVisible();
      await expect(page.getByRole('button', { name: '정렬 옵션' })).toBeVisible();
    });

    test('roadmap card opens the public viewer', async ({ page }) => {
      await page.getByRole('link', { name: /프론트엔드 개발자 로드맵/ }).click();
      await expect(page).toHaveURL(new RegExp(`/viewer/${FRONTEND_ROADMAP_ID}$`), {
        timeout: 30000,
      });
      await expect(page.locator('.react-flow:visible')).toBeVisible({ timeout: 30000 });
    });

    test('searches latest roadmaps and forks a result', async ({ page }) => {
      await page.getByRole('button', { name: '최신' }).click();
      await page.getByLabel('실행 과제 검색').fill('백엔드');
      await page.getByLabel('실행 과제 검색').press('Enter');

      await expect(page.getByRole('link', { name: /백엔드 개발자 로드맵/ })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByRole('link', { name: /프론트엔드 개발자 로드맵/ })).toHaveCount(0);

      await page.getByRole('link', { name: /백엔드 개발자 로드맵/ }).click();
      await expect(page).toHaveURL(new RegExp(`/viewer/${BACKEND_ROADMAP_ID}$`), {
        timeout: 30000,
      });

      await page.getByRole('button', { name: '내 과제로 복사', exact: true }).click();
      await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}$/, { timeout: 30000 });
    });
  });

  test.describe('Public Viewer', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/community/${FRONTEND_ROADMAP_ID}`);
      await expect(page).toHaveURL(new RegExp(`/viewer/${FRONTEND_ROADMAP_ID}$`), {
        timeout: 30000,
      });
      await expect(page.locator('.react-flow:visible')).toBeVisible({ timeout: 30000 });
    });

    test('renders roadmap title and viewer actions', async ({ page }) => {
      await expect(page.getByText('프론트엔드 개발자 로드맵', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '내 과제로 복사', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'AI 실행 피드백' })).toHaveCount(0);
    });

    test('fork action opens an editable copy', async ({ page }) => {
      await page.getByRole('button', { name: '내 과제로 복사', exact: true }).click();
      await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}$/, { timeout: 30000 });
      await expect(page.locator('.react-flow:visible')).toBeVisible({ timeout: 30000 });
    });

    test('back button is available', async ({ page }) => {
      await expect(page.getByLabel('뒤로가기')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('tab switching between 인기 and 최신 keeps content available', async ({ page }) => {
      await page.goto('/community');
      await expect(page.locator('a[href^="/community/"]').first()).toBeVisible({ timeout: 30000 });
      await page.getByRole('button', { name: '최신' }).click();
      await expect(page.locator('a[href^="/community/"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('저장한 과제 tab shows empty state', async ({ page }) => {
      await page.goto('/community');
      await expect(page.locator('a[href^="/community/"]').first()).toBeVisible({ timeout: 30000 });
      await page.getByRole('button', { name: '저장한 과제' }).click();
      await expect(page.getByText('저장된 실행 과제가 없습니다.')).toBeVisible();
    });

    test('missing public roadmap shows an error', async ({ page }) => {
      await page.goto(`/viewer/${MISSING_ROADMAP_ID}`);
      await expect(page.getByText('실행 과제를 찾을 수 없습니다')).toBeVisible({
        timeout: 30000,
      });
    });
  });
});
