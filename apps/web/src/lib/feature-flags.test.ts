import { afterEach, describe, expect, it, vi } from 'vitest';

describe('feature flags', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('keeps an explicit project-runs false in development', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'false');
    vi.stubEnv('NEXT_PUBLIC_E2E_MOCKING', 'false');
    vi.stubEnv('NEXT_PUBLIC_PROJECT_RUNS_ENABLED', 'false');

    const { isEnabled } = await import('./feature-flags');
    expect(isEnabled('PROJECT_RUNS_ENABLED')).toBe(false);
  });

  it('enables the development fallback when the project-runs flag is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'false');
    vi.stubEnv('NEXT_PUBLIC_E2E_MOCKING', 'false');
    vi.stubEnv('NEXT_PUBLIC_PROJECT_RUNS_ENABLED', '');

    const { isEnabled } = await import('./feature-flags');
    expect(isEnabled('PROJECT_RUNS_ENABLED')).toBe(true);
  });

  it('keeps project runs disabled in production without an explicit flag', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_PROJECT_RUNS_ENABLED', 'false');

    const { isEnabled } = await import('./feature-flags');
    expect(isEnabled('PROJECT_RUNS_ENABLED')).toBe(false);
  });
});
