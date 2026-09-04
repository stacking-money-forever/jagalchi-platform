import { expect, test } from '@playwright/test';

import { FIXTURE_MANUAL_CAPTURE_SOURCE_TEXT } from '@jagalchi/api-client';

import {
  completeWaveBWizardFromProfileReview,
  loginWithSeedUser,
  openWaveBTargetEntry,
  required,
} from './helpers';

const email = required('E2E_TEST_EMAIL');
const password = required('E2E_TEST_PASSWORD');
const userId = required('E2E_SEED_USER_ID');

test.describe('Phase 2 Wave B target entry', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithSeedUser(page, email, password, userId);
  });

  test('fixture intake can reach project run map', async ({ page }) => {
    test.setTimeout(300_000);

    await openWaveBTargetEntry(page);
    await page.getByRole('button', { name: '공고 가져오기' }).click();
    await completeWaveBWizardFromProfileReview(page);
  });

  test('manual capture without original URL can reach project run map', async ({ page }) => {
    test.setTimeout(300_000);

    const workflowPolls: string[] = [];
    page.on('response', (response) => {
      if (
        response.url().includes('/api/workflow-operations/') &&
        response.request().method() === 'GET' &&
        response.status() === 200
      ) {
        workflowPolls.push(response.url());
      }
    });

    await openWaveBTargetEntry(page);

    await page.getByRole('textbox').first().fill('');
    await page.getByRole('button', { name: '수동 캡처 입력' }).click();
    await page
      .getByPlaceholder('자동 수집이 실패한 경우 공고 본문을 붙여넣어 주세요.')
      .fill(FIXTURE_MANUAL_CAPTURE_SOURCE_TEXT);

    const targetImportRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/career/target-imports') && request.method() === 'POST',
    );
    await page.getByRole('button', { name: '공고 가져오기' }).click();

    const request = await targetImportRequest;
    const body = JSON.parse(request.postData() ?? '{}') as {
      input?: { kind?: string; originalUrl?: string; url?: string; sourceText?: string };
    };
    expect(body.input?.kind).toBe('MANUAL_CAPTURE');
    expect(body.input?.originalUrl).toBeUndefined();
    expect(body.input?.url).toBeUndefined();
    expect(body.input?.sourceText).toBe(FIXTURE_MANUAL_CAPTURE_SOURCE_TEXT);

    await completeWaveBWizardFromProfileReview(page);
    expect(workflowPolls.length).toBeGreaterThan(0);
  });
});
