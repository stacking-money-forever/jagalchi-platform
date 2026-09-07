#!/usr/bin/env node
import { createHash } from 'node:crypto';

const APPROVED_ANALYTICS_PROJECTS = {
  production: { host: 'https://us.i.posthog.com', tokenSha256: null },
  staging: {
    host: 'https://us.i.posthog.com',
    tokenSha256: '7171a1b0bd8932ef6a85955c3b4a0d73485cad7c90ea3db087754c0934d55c60',
  },
  preview: {
    host: 'https://us.i.posthog.com',
    tokenSha256: '7171a1b0bd8932ef6a85955c3b4a0d73485cad7c90ea3db087754c0934d55c60',
  },
  development: null,
};

const REQUIRED_PRODUCTION_FEATURE_FLAGS = [
  'NEXT_PUBLIC_REALTIME_ENABLED',
  'NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED',
  'NEXT_PUBLIC_PROOF_PROFILE_ENABLED',
  'NEXT_PUBLIC_OAUTH_ENABLED',
];

const environment = process.env.NEXT_PUBLIC_ENV;
const enabledValue = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
const analyticsEnabled = enabledValue === 'true';
const realtimeEnabled = process.env.NEXT_PUBLIC_REALTIME_ENABLED === 'true';
const isProductionCheck =
  process.argv.includes('--production') ||
  process.env.VERCEL_ENV === 'production' ||
  environment === 'production';
const errors = [];

if (realtimeEnabled) {
  const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (!realtimeUrl) {
    errors.push('NEXT_PUBLIC_REALTIME_URL is required when realtime is enabled.');
  } else {
    try {
      const parsed = new URL(realtimeUrl);
      const developmentLoopback =
        !isProductionCheck &&
        environment === 'development' &&
        parsed.protocol === 'http:' &&
        (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
      if (
        (parsed.protocol !== 'https:' && !developmentLoopback) ||
        parsed.origin !== realtimeUrl ||
        parsed.pathname !== '/' ||
        parsed.search ||
        parsed.hash ||
        parsed.username ||
        parsed.password
      ) {
        errors.push('NEXT_PUBLIC_REALTIME_URL must be an exact HTTPS origin, except loopback HTTP in development.');
      }
    } catch {
      errors.push('NEXT_PUBLIC_REALTIME_URL must be a valid absolute realtime origin.');
    }
  }
}

if (enabledValue !== undefined && enabledValue !== 'true' && enabledValue !== 'false') {
  errors.push('NEXT_PUBLIC_ANALYTICS_ENABLED must be exactly "true" or "false".');
}

if (environment && !(environment in APPROVED_ANALYTICS_PROJECTS)) {
  errors.push('NEXT_PUBLIC_ENV must be one of production, staging, preview, or development.');
}

if (isProductionCheck && environment !== 'production') {
  errors.push('NEXT_PUBLIC_ENV must be exactly "production" for a production deployment.');
}

if (analyticsEnabled) {
  const approvalEnvironment = isProductionCheck ? 'production' : environment;
  const approval = approvalEnvironment
    ? APPROVED_ANALYTICS_PROJECTS[approvalEnvironment]
    : undefined;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!approval) {
    errors.push(
      `Analytics is not approved for ${approvalEnvironment ?? 'an unknown environment'}.`,
    );
  }
  if (!key) errors.push('NEXT_PUBLIC_POSTHOG_KEY is required when analytics is enabled.');
  if (!host || host !== approval?.host) {
    errors.push('NEXT_PUBLIC_POSTHOG_HOST must exactly match the source-approved regional origin.');
  } else {
    const parsed = new URL(host);
    if (
      parsed.origin !== host ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash ||
      parsed.username ||
      parsed.password
    ) {
      errors.push('NEXT_PUBLIC_POSTHOG_HOST must not include credentials, path, query, or hash.');
    }
  }

  if (!approval?.tokenSha256) {
    errors.push(
      `No reviewed PostHog project fingerprint is committed for ${
        approvalEnvironment ?? 'this environment'
      }.`,
    );
  } else if (key) {
    const actualFingerprint = createHash('sha256').update(key).digest('hex');
    if (actualFingerprint !== approval.tokenSha256) {
      errors.push(`The PostHog project token is not approved for ${approvalEnvironment}.`);
    }
  }
}

if (isProductionCheck) {
  for (const flag of REQUIRED_PRODUCTION_FEATURE_FLAGS) {
    const value = process.env[flag];
    if (value !== 'true' && value !== 'false') {
      errors.push(`${flag} must be exactly "true" or "false" in production.`);
    }
  }

  if (process.env.NEXT_PUBLIC_API_MOCKING === 'true') {
    errors.push(
      'NEXT_PUBLIC_API_MOCKING must not be "true" in production — MSW should never intercept real users.',
    );
  }

  if (!process.env.NEXT_PUBLIC_API_URL) {
    errors.push('NEXT_PUBLIC_API_URL is required in production.');
  } else if (process.env.NEXT_PUBLIC_API_URL !== '/api') {
    errors.push(
      'NEXT_PUBLIC_API_URL must be exactly "/api" in production so browser requests use the same-origin Vercel proxy.',
    );
  }

  const apiOrigin = process.env.API_ORIGIN;
  if (!apiOrigin) {
    errors.push('API_ORIGIN is required in production.');
  } else {
    try {
      const parsedApiOrigin = new URL(apiOrigin);
      if (parsedApiOrigin.protocol !== 'https:') {
        errors.push('API_ORIGIN must use HTTPS in production.');
      }
      if (parsedApiOrigin.pathname !== '/' || parsedApiOrigin.search || parsedApiOrigin.hash) {
        errors.push('API_ORIGIN must not include a pathname, query string, or hash.');
      }
    } catch {
      errors.push('API_ORIGIN must be a valid absolute URL.');
    }
  }
}

if (!isProductionCheck && !analyticsEnabled && !environment) {
  console.log('[verify-prod-env] skipped outside deployment checks');
  process.exit(0);
}

if (errors.length > 0) {
  console.error('[verify-prod-env] environment checks failed:');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[verify-prod-env] OK');
