'use client';

import Link from 'next/link';

import {
  createApiTransport,
  getProjectRun,
  projectRunQueryKey,
  type ProjectRunProjection,
} from '@jagalchi/api-client';
import { useQuery } from '@tanstack/react-query';

import { ProjectRunWorkspace } from './project-run-workspace';
import { readCareerTarget } from './projection';

const transport = createApiTransport('/api', fetch);

export function ProjectRunLive({ initialRun }: { initialRun: ProjectRunProjection }) {
  const { data } = useQuery({
    queryKey: projectRunQueryKey(initialRun.id),
    queryFn: ({ signal }) => getProjectRun(transport, initialRun.id, signal),
    initialData: initialRun,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
  const target = readCareerTarget(data.target);
  const identity = [target?.company, target?.role].filter(Boolean).join(' · ');
  const stateLabel = {
    READY: '준비됨',
    ACTIVE: '진행 중',
    BLOCKED: '확인 필요',
    COMPLETED: '완료됨',
    ARCHIVED: '보관됨',
  }[data.state];
  return (
    <section className="journey-workspace min-w-0 space-y-6">
      <header className="border-border bg-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 sm:p-6">
        <div className="min-w-0">
          <Link
            href="/myroadmap"
            className="text-muted-foreground text-sm underline underline-offset-4"
          >
            내 프로젝트로 돌아가기
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{identity || '프로젝트 실행'}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {identity ? '현재 목표에 맞춘 작업 여정' : '현재 프로젝트의 작업 여정'}
          </p>
        </div>
        <span className="border-border bg-surface-raised rounded-full border px-3 py-2 text-sm font-medium">
          {stateLabel}
        </span>
      </header>
      <ProjectRunWorkspace run={data} />
    </section>
  );
}
