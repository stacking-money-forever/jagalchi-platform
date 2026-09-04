import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { defaultSeedAuthDir, resolveSeedAuthStoragePath } from './e2e-v1-local/auth-state';

const baseURL = 'http://127.0.0.1:3100';
const seedAuthStorageState = resolveSeedAuthStoragePath(defaultSeedAuthDir());

export default defineConfig({
  testDir: './e2e-v1-local',
  globalTeardown: './e2e-v1-local/auth.teardown.ts',
  timeout: 60_000,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup-seed-auth',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium-no-msw',
      use: {
        ...devices['Desktop Chrome'],
        storageState: seedAuthStorageState,
      },
      // Optional: run setup-seed-auth first to reuse persisted storageState instead of worker login.
      dependencies: ['setup-seed-auth'],
      testIgnore: [/auth\.setup\.ts/, /\.test\.ts$/, /phase-two-fixtures\.ts$/],
    },
  ],
  webServer: {
    command: 'pnpm start --hostname 127.0.0.1 --port 3100',
    cwd: import.meta.dirname,
    env: {
      API_ORIGIN: 'http://127.0.0.1:8080',
      NEXT_PUBLIC_API_URL: '/api',
      NEXT_PUBLIC_ENV: 'development',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
      NEXT_PUBLIC_API_MOCKING: 'false',
      NEXT_PUBLIC_E2E_MOCKING: 'false',
      NEXT_PUBLIC_REALTIME_ENABLED: 'true',
      NEXT_PUBLIC_REALTIME_URL: 'http://127.0.0.1:8080',
      NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED: 'true',
      NEXT_PUBLIC_PROJECT_RUNS_ENABLED: 'true',
      NEXT_PUBLIC_PROOF_PROFILE_ENABLED: 'true',
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
