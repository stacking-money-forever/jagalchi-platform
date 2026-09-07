'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { renewWebSessionOnce } from './session-renewal-coordinator';

export function SessionRenewalBoundary() {
  const router = useRouter();
  const attempted = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void renewWebSessionOnce().then((renewed) => {
      if (renewed) router.refresh();
      else setFailed(true);
    });
  }, [router]);

  if (failed) {
    return (
      <section role="alert" className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">세션이 만료됐어요</h1>
        <p className="text-muted-foreground mt-2">
          다시 로그인하면 프로젝트 실행을 이어갈 수 있습니다.
        </p>
        <Link href="/login" className="mt-5 inline-flex rounded-lg border px-4 py-2 font-semibold">
          로그인
        </Link>
      </section>
    );
  }

  return <ProjectRunSkeleton label="세션을 갱신하고 있어요" />;
}

export function ProjectRunSkeleton({
  label = '프로젝트 실행을 불러오고 있어요',
}: {
  label?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="mx-auto max-w-6xl animate-pulse space-y-4 p-6 motion-reduce:animate-none"
    >
      <div className="bg-muted h-9 w-72 rounded" />
      <div className="bg-muted h-[420px] rounded-2xl" />
    </div>
  );
}
