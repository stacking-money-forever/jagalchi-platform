import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const script = resolve(process.cwd(), 'scripts/verify-prod-env.mjs');

const productionFeatureFlags = {
  NEXT_PUBLIC_REALTIME_ENABLED: 'true',
  NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED: 'true',
  NEXT_PUBLIC_PROOF_PROFILE_ENABLED: 'true',
  NEXT_PUBLIC_OAUTH_ENABLED: 'true',
};

const realtimeProductionEnv = {
  NEXT_PUBLIC_REALTIME_URL: 'https://realtime.example.com',
};

function verify(env: Record<string, string>, args: string[] = []) {
  const childEnvironment = { ...process.env };
  for (const flag of Object.keys(productionFeatureFlags)) {
    delete childEnvironment[flag];
  }
  delete childEnvironment.NEXT_PUBLIC_REALTIME_URL;
  return spawnSync(process.execPath, [script, ...args], {
    env: { ...childEnvironment, ...env },
    encoding: 'utf8',
  });
}

describe('verify-prod-env analytics gate', () => {
  it('accepts disabled staging and rejects malformed enable values', () => {
    expect(
      verify({ NEXT_PUBLIC_ENV: 'staging', NEXT_PUBLIC_ANALYTICS_ENABLED: 'false' }).status,
    ).toBe(0);
    const malformed = verify({
      NEXT_PUBLIC_ENV: 'staging',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'yes',
    });
    expect(malformed.status).toBe(1);
    expect(malformed.stderr).toContain('must be exactly');
  });

  it('fails closed for development and unapproved project tokens', () => {
    const development = verify({
      NEXT_PUBLIC_ENV: 'development',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'true',
      NEXT_PUBLIC_POSTHOG_KEY: 'test',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
    });
    expect(development.status).toBe(1);
    expect(development.stderr).toContain('not approved');

    const staging = verify({
      NEXT_PUBLIC_ENV: 'staging',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'true',
      NEXT_PUBLIC_POSTHOG_KEY: 'test',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
    });
    expect(staging.status).toBe(1);
    expect(staging.stderr).toContain('The PostHog project token is not approved for staging');
  });

  it('rejects every host except the committed regional origin', () => {
    const wrongRegion = verify({
      NEXT_PUBLIC_ENV: 'staging',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'true',
      NEXT_PUBLIC_POSTHOG_KEY: 'test',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
    });
    expect(wrongRegion.status).toBe(1);
    expect(wrongRegion.stderr).toContain('source-approved regional origin');
  });

  it.each([
    ['--production', {}, ['--production']],
    ['VERCEL_ENV=production', { VERCEL_ENV: 'production' }, []],
  ])(
    'rejects %s with an otherwise configured non-production analytics environment',
    (_productionSignal, productionEnv, args) => {
      for (const environment of ['staging', 'preview']) {
        const result = verify(
          {
            ...productionEnv,
            ...productionFeatureFlags,
            NEXT_PUBLIC_ENV: environment,
            NEXT_PUBLIC_ANALYTICS_ENABLED: 'true',
            NEXT_PUBLIC_POSTHOG_KEY: 'test',
            NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
            NEXT_PUBLIC_API_URL: '/api',
            API_ORIGIN: 'https://api.example.com',
            ...realtimeProductionEnv,
          },
          args,
        );
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(
          'NEXT_PUBLIC_ENV must be exactly "production" for a production deployment.',
        );
        expect(result.stderr).toContain(
          'No reviewed PostHog project fingerprint is committed for production.',
        );
      }
    },
  );

  it('blocks analytics when NEXT_PUBLIC_ENV selects production approval', () => {
    const result = verify({
      NEXT_PUBLIC_ENV: 'production',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'true',
      NEXT_PUBLIC_POSTHOG_KEY: 'test',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
      NEXT_PUBLIC_API_URL: '/api',
      API_ORIGIN: 'https://api.example.com',
      ...realtimeProductionEnv,
      ...productionFeatureFlags,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'No reviewed PostHog project fingerprint is committed for production.',
    );
  });

  it.each([
    'NEXT_PUBLIC_REALTIME_ENABLED',
    'NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED',
    'NEXT_PUBLIC_PROOF_PROFILE_ENABLED',
    'NEXT_PUBLIC_OAUTH_ENABLED',
  ])('requires %s in production', (flag) => {
    const withoutFlag: Record<string, string> = { ...productionFeatureFlags };
    delete withoutFlag[flag];
    const result = verify({
      NEXT_PUBLIC_ENV: 'production',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
      NEXT_PUBLIC_API_URL: '/api',
      API_ORIGIN: 'https://api.example.com',
      ...realtimeProductionEnv,
      NEXT_PUBLIC_API_MOCKING: 'false',
      ...withoutFlag,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${flag} must be exactly "true" or "false" in production.`);
  });

  it.each([
    'NEXT_PUBLIC_REALTIME_ENABLED',
    'NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED',
    'NEXT_PUBLIC_PROOF_PROFILE_ENABLED',
    'NEXT_PUBLIC_OAUTH_ENABLED',
  ])('rejects invalid %s values in production', (flag) => {
    const result = verify({
      NEXT_PUBLIC_ENV: 'production',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
      NEXT_PUBLIC_API_URL: '/api',
      API_ORIGIN: 'https://api.example.com',
      ...realtimeProductionEnv,
      NEXT_PUBLIC_API_MOCKING: 'false',
      ...productionFeatureFlags,
      [flag]: 'yes',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${flag} must be exactly "true" or "false" in production.`);
  });

  it('accepts a full-feature all-true production configuration', () => {
    const result = verify({
      NEXT_PUBLIC_ENV: 'production',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
      NEXT_PUBLIC_API_URL: '/api',
      API_ORIGIN: 'https://api.example.com',
      ...realtimeProductionEnv,
      NEXT_PUBLIC_API_MOCKING: 'false',
      ...productionFeatureFlags,
    });
    expect(result.status).toBe(0);
  });

  it.each([
    [undefined, 'is required'],
    ['http://realtime.example.com', 'exact HTTPS origin'],
    ['https://realtime.example.com/socket', 'exact HTTPS origin'],
    ['https://user:pass@realtime.example.com', 'exact HTTPS origin'],
  ])('rejects invalid realtime origin %s when enabled', (realtimeUrl, message) => {
    const env: Record<string, string> = {
      NEXT_PUBLIC_ENV: 'production',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
      NEXT_PUBLIC_API_URL: '/api',
      API_ORIGIN: 'https://api.example.com',
      NEXT_PUBLIC_API_MOCKING: 'false',
      ...productionFeatureFlags,
    };
    if (realtimeUrl) env.NEXT_PUBLIC_REALTIME_URL = realtimeUrl;
    const result = verify(env);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(message);
  });

  it('allows exact loopback HTTP realtime only in development', () => {
    const development = verify({
      NEXT_PUBLIC_ENV: 'development',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
      NEXT_PUBLIC_REALTIME_ENABLED: 'true',
      NEXT_PUBLIC_REALTIME_URL: 'http://127.0.0.1:8080',
    });
    expect(development.status).toBe(0);

    const staging = verify({
      NEXT_PUBLIC_ENV: 'staging',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
      NEXT_PUBLIC_REALTIME_ENABLED: 'true',
      NEXT_PUBLIC_REALTIME_URL: 'http://127.0.0.1:8080',
    });
    expect(staging.status).toBe(1);
  });

  it('rejects a direct browser-to-API URL in production', () => {
    const result = verify({
      NEXT_PUBLIC_ENV: 'production',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
      NEXT_PUBLIC_API_URL: 'https://api.example.com/api',
      API_ORIGIN: 'https://api.example.com',
      NEXT_PUBLIC_API_MOCKING: 'false',
      ...productionFeatureFlags,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must be exactly "/api" in production');
  });
});
