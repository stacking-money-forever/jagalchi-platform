'use client';

import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { Badge, type BadgeIntent } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { ProjectRunProjection } from '@jagalchi/api-client';

const runStatePresentation: Record<
  ProjectRunProjection['state'],
  { label: string; intent: BadgeIntent }
> = {
  READY: { label: '준비', intent: 'neutral' },
  ACTIVE: { label: '진행 중', intent: 'primary' },
  BLOCKED: { label: '막힘', intent: 'warning' },
  COMPLETED: { label: '완료', intent: 'success' },
  ARCHIVED: { label: '보관됨', intent: 'neutral' },
};

function runLabel(run: ProjectRunProjection): string {
  if (run.target) return `${run.target.company} · ${run.target.role}`;
  return `프로젝트 실행 ${run.id.slice(0, 8)}`;
}

function resumeTarget(run: ProjectRunProjection): string {
  const taskId = run.currentTaskId ?? run.recommendedTaskId;
  const base = `/projects/${encodeURIComponent(run.id)}`;
  return taskId ? `${base}?task=${encodeURIComponent(taskId)}` : base;
}

function runActionLabel(state: ProjectRunProjection['state']): string {
  switch (state) {
    case 'READY':
      return '실행 시작';
    case 'ACTIVE':
      return '이어서 실행';
    case 'BLOCKED':
      return '막힘 확인';
    case 'COMPLETED':
      return '결과 확인';
    case 'ARCHIVED':
      return '기록 확인';
  }
}

function taskSummary(run: ProjectRunProjection): { label: string; title: string } {
  const taskId = run.currentTaskId ?? run.recommendedTaskId;
  const task = taskId ? run.tasks.find((candidate) => candidate.id === taskId) : undefined;
  return {
    label: run.currentTaskId ? '현재 작업' : '다음 작업',
    title: task?.title ?? '실행 개요 확인',
  };
}

function updatedAtLabel(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

interface ProjectRunsSectionProps {
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

export function ProjectRunsSection({
  runs,
  isLoading = false,
  isError = false,
  isNextPageError = false,
  canCreateProjectRun = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onRetry,
  onRetryNextPage,
  onLoadMore,
}: ProjectRunsSectionProps) {
  const hasRuns = runs.length > 0;

  return (
    <section aria-labelledby="project-runs-heading" className="border-border border-y py-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="project-runs-heading" className="text-lg leading-tight font-extrabold">
            프로젝트 실행
          </h2>
          <p className="text-muted-foreground text-sm leading-6">
            목표 회사와 직무별 실행 상태를 확인하고 필요한 작업으로 돌아가세요.
          </p>
        </div>
        <p className="text-muted-foreground text-xs font-semibold">불러온 실행 {runs.length}개</p>
      </div>

      {isLoading && !hasRuns ? (
        <p className="text-muted-foreground mt-5 text-sm" role="status">
          프로젝트 실행을 불러오고 있습니다.
        </p>
      ) : null}

      {isError && !hasRuns ? (
        <div className="mt-5 flex flex-col items-start gap-3" role="alert">
          <p className="text-sm font-semibold">프로젝트 실행을 불러오지 못했습니다.</p>
          <Button intent="neutral" variant="outline" size="md" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && !hasRuns ? (
        <div className="mt-5 flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-sm">프로젝트 실행이 없습니다.</p>
          {canCreateProjectRun ? (
            <Button asChild intent="neutral" variant="outline" size="md">
              <Link href="/create">
                새 프로젝트 실행 만들기
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {hasRuns ? (
        <ul className="divide-border mt-4 divide-y" aria-label="프로젝트 실행 목록">
          {runs.map((run) => {
            const state = runStatePresentation[run.state];
            const task = taskSummary(run);
            const updatedAt = updatedAtLabel(run.updatedAt);
            const label = runLabel(run);
            const actionLabel = runActionLabel(run.state);
            return (
              <li
                key={run.id}
                className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 text-sm leading-6 font-bold break-words">{label}</h3>
                    <Badge intent={state.intent} variant="subtle" size="sm">
                      {state.label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm leading-6 break-words">
                    <span className="font-semibold">{task.label}</span> · {task.title}
                  </p>
                  {updatedAt ? (
                    <time
                      className="text-muted-foreground mt-1 block text-xs"
                      dateTime={run.updatedAt}
                    >
                      {updatedAt} 업데이트
                    </time>
                  ) : null}
                </div>

                <Button asChild intent="neutral" variant="outline" size="md">
                  <Link href={resumeTarget(run)} aria-label={`${label} ${actionLabel}`}>
                    {actionLabel}
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hasRuns && isNextPageError ? (
        <div className="mt-4 flex flex-wrap items-center gap-3" role="alert">
          <p className="text-muted-foreground text-sm">다음 프로젝트 실행을 불러오지 못했습니다.</p>
          <Button intent="neutral" variant="outline" size="md" onClick={onRetryNextPage}>
            다시 시도
          </Button>
        </div>
      ) : null}

      {hasRuns && hasNextPage && !isNextPageError ? (
        <div className="mt-4 flex justify-center" aria-live="polite">
          <Button
            intent="neutral"
            variant="outline"
            size="md"
            loading={isFetchingNextPage}
            loadingLabel="불러오는 중"
            onClick={onLoadMore}
          >
            더 보기
          </Button>
        </div>
      ) : null}
    </section>
  );
}
