import { Suspense } from 'react';

import { OAuthCallback } from '@/features/auth/components/organisms/OAuthCallback';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인 완료',
  robots: { index: false, follow: false },
};

async function OAuthCallbackContent({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const rawCode = (await searchParams).code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  return <OAuthCallback code={code ?? null} />;
}

export default function OAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p className="p-8 text-center">로그인을 마무리하고 있어요…</p>}>
      <OAuthCallbackContent searchParams={searchParams} />
    </Suspense>
  );
}
