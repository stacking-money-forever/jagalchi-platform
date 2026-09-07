'use client';

import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ProjectRunsSection } from '@/features/project-runs/components/project-runs-section';

import type { ProjectRunProjection } from '@jagalchi/api-client';

function currentRun(runs: readonly ProjectRunProjection[]) {
  return runs.find((run) => run.currentTaskId) ?? runs.find((run) => run.recommendedTaskId) ?? null;
}

function runName(run: ProjectRunProjection): string {
  return run.target ? `${run.target.company} · ${run.target.role}` : '프로젝트 실행';
}

function currentTaskName(run: ProjectRunProjection): string {
  const taskId = run.currentTaskId ?? run.recommendedTaskId;
  return run.tasks.find((task) => task.id === taskId)?.title ?? '실행 개요';
}

function projectHref(run: ProjectRunProjection): string {
  const taskId = run.currentTaskId ?? run.recommendedTaskId;
  const base = `/projects/${encodeURIComponent(run.id)}`;
  return taskId ? `${base}?task=${encodeURIComponent(taskId)}` : base;
}

export interface MyProjectsHomeProps {
  runs: readonly ProjectRunProjection[];
  isLoading?: boolean;
  isError?: boolean;
  isNextPageError?: boolean;
  canCreateProjectRun?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onRetry?: () => void;
  onRetryNextPage?: () => void;
  onLoadMore?: () => void;
}

export function MyProjectsHome({ runs, ...sectionProps }: MyProjectsHomeProps) {
  const activeRun = currentRun(runs);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-2 sm:py-5">
      <section
        aria-labelledby="my-projects-heading"
        className="border-border bg-card rounded-2xl border p-5 sm:p-7"
      >
        <p className="text-muted-foreground text-sm font-semibold">내 프로젝트</p>
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1
              id="my-projects-heading"
              className="text-2xl font-extrabold tracking-tight sm:text-3xl"
            >
              지금 이어갈 프로젝트
            </h1>
            {activeRun ? (
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                불러온 프로젝트 중 현재 또는 다음 작업이 있는 항목입니다.
              </p>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                현재 작업이 있는 프로젝트를 불러오면 여기에서 바로 이어갈 수 있습니다.
              </p>
            )}
          </div>
          <Button asChild intent="primary" size="md">
            <Link href="/projects/new">
              프로젝트 만들기
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {activeRun ? (
          <div className="border-border bg-surface-raised mt-6 flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold break-words">{runName(activeRun)}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6 break-words">
                <span className="font-semibold">
                  {activeRun.currentTaskId ? '현재 작업' : '다음 작업'}
                </span>
                {' · '}
                {currentTaskName(activeRun)}
              </p>
            </div>
            <Button asChild intent="neutral" variant="outline" size="md">
              <Link href={projectHref(activeRun)}>작업으로 가기</Link>
            </Button>
          </div>
        ) : null}
      </section>

      <ProjectRunsSection runs={runs} {...sectionProps} />
    </div>
  );
}
