import { Suspense } from 'react';

import Link from 'next/link';

import { ArrowRight, Search } from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import { ExploreResults } from '@/features/explore/components/explore-results';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '과제 템플릿',
  description: '지원에 필요한 결과물을 만드는 실전 과제 템플릿을 찾아보세요.',
};

const topics = ['전체', '테스트', '성능', '접근성', 'API', '아키텍처', '배포'];

type ExploreSearchParams = {
  q?: string | string[];
  topic?: string | string[];
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function topicHref(topic: string, query: string) {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('q', query);
  }
  if (topic !== '전체') {
    params.set('topic', topic);
  }
  const queryString = params.toString();
  return queryString ? `/explore?${queryString}` : '/explore';
}

async function ExplorePageContent({
  searchParams,
}: {
  searchParams: Promise<ExploreSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = firstSearchParam(resolvedSearchParams.q);
  const topicParam = firstSearchParam(resolvedSearchParams.topic);
  const activeTopic = topicParam.trim() || '전체';

  return (
    <AppShell activeTab="explore">
      <div className="flex w-full flex-col gap-8">
        <header className="bg-primary-subtle flex w-full flex-col gap-[18px] rounded-xl px-[38px] py-[34px]">
          <h1 className="text-[30px] leading-[1.2] font-extrabold tracking-tight">
            지원에 쓸 결과물 과제를 찾아보세요
          </h1>
          <p className="text-muted-foreground text-sm leading-6">
            PR·테스트·배포처럼 완료 조건이 분명한 과제를 내 프로젝트에 적용하세요.
          </p>
          <form action="/explore" className="w-full max-w-[720px]" role="search">
            <label htmlFor="roadmap-search" className="sr-only">
              실전 과제 또는 증거 유형 검색
            </label>
            <div className="relative w-full">
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
              />
              <input
                id="roadmap-search"
                name="q"
                type="search"
                placeholder="예: 로그인 E2E 테스트 추가"
                defaultValue={query}
                className="border-border bg-surface placeholder:text-muted-foreground focus-visible:ring-ring h-[52px] w-full rounded-full border pr-4 pl-11 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              />
            </div>
            {topicParam.trim() ? <input type="hidden" name="topic" value={topicParam} /> : null}
            <button type="submit" className="sr-only">
              검색
            </button>
          </form>
        </header>

        <nav aria-label="과제 주제" className="w-full overflow-x-auto">
          <ul className="flex min-w-max gap-2">
            {topics.map((topic) => {
              const isActive = activeTopic === topic;

              return (
                <li key={topic}>
                  <Link
                    href={topicHref(topic, query)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'inline-flex items-center rounded-full px-[13px] py-[9px] text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-primary-subtle text-primary focus-visible:ring-ring'
                        : 'border-border bg-surface hover:bg-accent focus-visible:ring-ring border',
                    ].join(' ')}
                  >
                    {topic}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <section aria-labelledby="results-heading">
          <div className="mb-[18px] flex items-center justify-between">
            <h2 id="results-heading" className="text-[22px] leading-[1.3] font-extrabold">
              증거를 만드는 과제 템플릿
            </h2>
          </div>

          <Suspense fallback={<p className="text-muted-foreground text-sm">과제 준비 중…</p>}>
            <ExploreResults />
          </Suspense>
        </section>

        <aside
          aria-labelledby="community-heading"
          className="border-border bg-surface flex flex-col items-start justify-between gap-6 rounded-lg border p-6 sm:flex-row sm:items-center"
        >
          <div className="flex flex-col gap-[7px]">
            <p className="text-primary text-[11px] font-bold">커뮤니티</p>
            <h2 id="community-heading" className="text-[21px] leading-[1.3] font-extrabold">
              완료 사례와 보완 피드백을 확인하세요
            </h2>
            <p className="text-muted-foreground text-[13px] leading-5">
              다른 개발자가 어떤 PR과 배포 결과로 과제를 끝냈는지 둘러볼 수 있어요.
            </p>
          </div>
          <Link
            href="/community"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-12 shrink-0 items-center gap-2 rounded-md px-[18px] text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            커뮤니티 보기
            <ArrowRight aria-hidden="true" className="size-[18px]" />
          </Link>
        </aside>
      </div>
    </AppShell>
  );
}

export default function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<ExploreSearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <AppShell activeTab="explore">
          <p className="text-muted-foreground p-8 text-sm">과제 템플릿을 준비하고 있어요…</p>
        </AppShell>
      }
    >
      <ExplorePageContent searchParams={searchParams} />
    </Suspense>
  );
}
