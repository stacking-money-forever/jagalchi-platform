import path from 'node:path';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';

const dirname = import.meta.dirname;

export default defineConfig({
  test: {
    testTimeout: 10000,
    projects: [
      {
        extends: true,
        plugins: [react()],
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./vitest.setup.ts'],
        },
        resolve: {
          alias: {
            '@': path.resolve(dirname, './src'),
          },
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            // pnpm may materialize Vitest's peer graph under distinct hashes even at the same
            // version; the provider runtime contract remains the one consumed by this config.
            provider: playwright({}) as never,
            instances: [{ browser: 'chromium' }],
          },
          pool: 'forks',
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
