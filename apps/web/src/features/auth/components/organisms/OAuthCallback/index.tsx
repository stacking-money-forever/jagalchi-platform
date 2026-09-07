'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useSetAtom } from 'jotai';

import { exchangeOAuthCode, type OAuthExchangeResponse } from '@/api/auth';
import { capture } from '@/lib/analytics/client';

import { loginAtom } from '../../../stores/auth.atoms';

const exchangeByCode = new Map<string, Promise<OAuthExchangeResponse>>();

function exchangeOnce(code: string): Promise<OAuthExchangeResponse> {
  const existing = exchangeByCode.get(code);
  if (existing) return existing;

  const request = exchangeOAuthCode(code).then((result) => {
    capture('oauth_completed', {});
    return result;
  });
  exchangeByCode.set(code, request);
  const clear = () => {
    if (exchangeByCode.get(code) === request) exchangeByCode.delete(code);
  };
  void request.then(clear, clear);
  return request;
}

export function OAuthCallback({ code }: { code: string | null }) {
  const router = useRouter();
  const setLogin = useSetAtom(loginAtom);
  const [error, setError] = useState<string | null>(code ? null : '로그인 완료 코드가 없습니다.');

  useEffect(() => {
    if (!code) return;
    window.history.replaceState(window.history.state, '', window.location.pathname);

    let active = true;
    void exchangeOnce(code)
      .then((result) => {
        if (!active) return;
        setLogin(result);
        router.replace('/');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : '로그인을 완료하지 못했습니다.');
      });
    return () => {
      active = false;
    };
  }, [code, router, setLogin]);

  return (
    <div className="border-border bg-card rounded-3xl border p-8 text-center shadow-sm">
      {error ? (
        <>
          <h1 className="text-xl font-extrabold">로그인을 완료하지 못했어요</h1>
          <p role="alert" className="text-destructive mt-3 text-sm leading-6">
            {error}
          </p>
          <Link
            href="/login"
            className="bg-primary text-primary-foreground mt-6 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-bold"
          >
            로그인으로 돌아가기
          </Link>
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="border-primary/20 border-t-primary mx-auto size-8 animate-spin rounded-full border-4"
          />
          <h1 className="mt-5 text-xl font-extrabold">로그인을 마무리하고 있어요</h1>
          <p className="text-muted-foreground mt-2 text-sm">잠시만 기다려 주세요.</p>
        </>
      )}
    </div>
  );
}
