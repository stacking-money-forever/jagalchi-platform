import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 * - Chromium only (속도 최적화)
 * - webServer: pnpm dev 자동 실행
 * - MSW 설정: 실제 개발 기본값과 분리하고 E2E 서버에서만 명시적으로 활성화
 */
const e2ePort = process.env.E2E_PORT ?? '3100';
const e2eBaseUrl = `http://localhost:${e2ePort}`;

const e2eEnv = {
  NEXT_PUBLIC_API_URL: '/api',
  NEXT_PUBLIC_API_MOCKING: 'true',
  NEXT_PUBLIC_E2E_MOCKING: 'true',
  NEXT_PUBLIC_REALTIME_ENABLED: 'true',
  NEXT_PUBLIC_REALTIME_URL: 'https://api.example.com',
  NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED: 'true',
  NEXT_PUBLIC_PROOF_PROFILE_ENABLED: 'true',
  NEXT_PUBLIC_SITE_URL: e2eBaseUrl,
};

const useProductionServer = process.env.E2E_USE_PRODUCTION_SERVER === 'true';

export const config = defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // headless shell은 service worker 미지원 → MSW 동작 위해 일반 headless 사용
        launchOptions: { args: ['--headless=new'] },
      },
    },
  ],
  webServer: {
    command: useProductionServer
      ? `PORT=${e2ePort} node_modules/.bin/next start`
      : `pnpm dev --port ${e2ePort}`,
    env: e2eEnv,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 120000,
  },
});

// Playwright requires default export
// eslint-disable-next-line import/no-default-export
export default config;
