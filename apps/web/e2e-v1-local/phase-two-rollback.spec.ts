import { expect, test } from './phase-two-fixtures';
import { ensureSeedSession } from './helpers';

test.describe('phase2-rollback:flags-off', () => {
  test('phase2-rollback:flags-off-mutation-blocked-routes-preserved', async ({ page }) => {
    await ensureSeedSession(page);
    await page.goto('/create');
    await expect(page.getByRole('link', { name: '부족한 증거 확인' })).toHaveCount(0);
    const projectResponse = await page.goto('/projects/new');
    expect(projectResponse?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: '목표 공고 → 프로젝트 실행' }),
    ).not.toBeVisible();
    await page.goto('/career');
    await expect(page).toHaveURL(/\/career$/);
    await page.goto('/myroadmap');
    await expect(page).toHaveURL(/\/myroadmap$/);
  });
});
