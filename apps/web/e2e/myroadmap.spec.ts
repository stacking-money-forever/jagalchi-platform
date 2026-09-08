import { expect, test } from '@playwright/test';

import { loginAsTestUser } from './helpers/auth';

test.describe('My Projects E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/myroadmap');
    await expect(page.getByRole('heading', { name: '지금 이어갈 프로젝트' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('presents the project workspace and its primary action', async ({ page }) => {
    const workspace = page.getByRole('region', { name: '지금 이어갈 프로젝트' });

    await expect(workspace.getByText('내 프로젝트', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('link', { name: '프로젝트 만들기' })).toHaveAttribute(
      'href',
      '/projects/new',
    );
    await expect(page.getByRole('heading', { name: '프로젝트 실행' })).toBeVisible();
  });

  test('opens the new-project flow from the primary action', async ({ page }) => {
    await page
      .getByRole('region', { name: '지금 이어갈 프로젝트' })
      .getByRole('link', { name: '프로젝트 만들기' })
      .click();

    await expect(page).toHaveURL(/\/projects\/new$/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('keeps the saved-roadmap library available in global navigation', async ({ page }) => {
    await expect(page.getByRole('link', { name: '라이브러리' })).toHaveAttribute(
      'href',
      '/library',
    );
  });
});
