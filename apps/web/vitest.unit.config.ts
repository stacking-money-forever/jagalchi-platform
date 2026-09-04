import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const dirname = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    name: 'unit',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'e2e-v1-local/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    globalSetup: ['./vitest.global-setup.ts'],
    reporters: process.env.CI ? ['default', './vitest.force-exit-reporter.ts'] : ['default'],
  },
});
