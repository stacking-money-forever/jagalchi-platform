import { expect, test } from '@playwright/test';

import { expectNoServiceWorker, loginWithSeedUser, required } from './helpers';

const email = required('E2E_TEST_EMAIL');
const password = required('E2E_TEST_PASSWORD');
const userId = required('E2E_SEED_USER_ID');

test.describe('Phase 2 Wave B target entry', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithSeedUser(page, email, password, userId);
  });

  test('fixture intake can reach project run map', async ({ page }) => {
    test.setTimeout(300_000);

    await page.goto('/projects/new');
    await expectNoServiceWorker(page);
    await expect(page.getByText('목표 공고 → 프로젝트 실행')).toBeVisible();

    await page.getByRole('button', { name: '공고 가져오기' }).click();

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
      if (optionCount > 1) {
        await repoSelect.selectOption({ index: 1 });
      }
    }

    await page.getByRole('button', { name: '범위 확인으로 계속' }).click();
    await page.getByRole('button', { name: '프로젝트 실행 만들기' }).click();

    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/i, { timeout: 180_000 });
    await expect(page.getByRole('tab', { name: '지도' })).toBeVisible();
    await expectNoServiceWorker(page);
  });
});
