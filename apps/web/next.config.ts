import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

import type { NextConfig } from 'next';

const API_ORIGIN = process.env.API_ORIGIN ?? 'https://api.jagalchi.dev';
const CDN_ORIGIN = 'https://cdn.jagalchi.dev';
const APPROVED_ANALYTICS_ORIGINS = new Set(['https://us.i.posthog.com']);

function getOrigin(value: string | undefined): string | undefined {
  if (!value || value.startsWith('/')) return undefined;

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function getAnalyticsOrigin(): string | undefined {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'true') return undefined;

  const value = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!value || !APPROVED_ANALYTICS_ORIGINS.has(value)) return undefined;

  const parsed = new URL(value);
  if (parsed.origin !== value || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    return undefined;
  }
  return parsed.origin;
}

function toWebSocketOrigin(origin: string): string {
  return origin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}

const PUBLIC_API_ORIGIN = getOrigin(process.env.NEXT_PUBLIC_API_URL);
const PUBLIC_REALTIME_HTTP_ORIGIN = getOrigin(process.env.NEXT_PUBLIC_REALTIME_URL) ?? API_ORIGIN;
const PUBLIC_REALTIME_TRANSPORT_ORIGIN = toWebSocketOrigin(PUBLIC_REALTIME_HTTP_ORIGIN);
const ANALYTICS_ORIGIN = getAnalyticsOrigin();
const CONNECT_ORIGINS = Array.from(
  new Set(
    [
      'self',
      API_ORIGIN,
      PUBLIC_API_ORIGIN,
      PUBLIC_REALTIME_HTTP_ORIGIN,
      PUBLIC_REALTIME_TRANSPORT_ORIGIN,
      ANALYTICS_ORIGIN,
    ]
      .filter((origin): origin is string => Boolean(origin))
      .map((origin) => (origin === 'self' ? "'self'" : origin)),
  ),
).join(' ');

const cspHeader = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${CDN_ORIGIN} https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://*.r2.dev https://*.s3.amazonaws.com`,
  `font-src 'self'`,
  `connect-src ${CONNECT_ORIGINS}`,
  `frame-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  process.env.NODE_ENV === 'production' ? `upgrade-insecure-requests` : undefined,
]
  .filter((directive): directive is string => Boolean(directive))
  .join('; ')
  .trim();

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'cdn.jagalchi.dev' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const hasSentryDsn = Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);

export default hasSentryDsn
  ? withSentryConfig(bundleAnalyzer(nextConfig), {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : bundleAnalyzer(nextConfig);
