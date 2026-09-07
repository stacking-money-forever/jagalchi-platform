'use client';

import { useState } from 'react';

import { ApiResponseError, type ProjectRunProjection } from '@jagalchi/api-client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { StatusChip } from '../components/roadmap/status-presentation';
import { useProjectRunCommands } from '../hooks/use-project-run-commands';
import { evidenceRequirementLabelKo, resolveRepositoryDisplayName } from '../projection';

import type { RoadmapGraphModel } from '../projection';

function taskById(model: RoadmapGraphModel, id: string | null | undefined) {
  return id ? (model.tasks.find((task) => task.id === id) ?? null) : null;
}

function prerequisiteTitles(model: RoadmapGraphModel, taskId: string): string[] {
  return (
    taskById(model, taskId)
      ?.prerequisiteIds.map((id) => taskById(model, id)?.title)
      .filter((title): title is string => Boolean(title)) ?? []
  );
}

function commandErrorCopy(error: unknown): string {
  if (
    error instanceof ApiResponseError &&
    (error.status === 409 || error.code === 'STALE_PROJECTION')
  ) {
    return '프로젝트 상태가 갱신되었습니다. 최신 상태를 확인한 뒤 다시 시도하세요.';
  }
  return '작업을 처리하지 못했습니다. 잠시 후 최신 상태에서 다시 시도하세요.';
}

type TaskDraft = { pullNumber: string };

/** Reading-first task document. Selection is navigation only; commands remain server-authoritative. */
export function ProjectRunFocusView({
  run,
  model,
  selectedTaskId,
  onTaskSelect,
}: {
  run: ProjectRunProjection;
  model: RoadmapGraphModel;
  selectedTaskId?: string | null;
  onTaskSelect?: (taskId: string | null) => void;
}) {
  const commands = useProjectRunCommands(run);
  const [bindingDrafts, setBindingDrafts] = useState<Record<string, TaskDraft>>({});
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const current = taskById(model, run.currentTaskId);
  const recommended = taskById(model, run.recommendedTaskId);
  const focusTask = taskById(model, selectedTaskId) ?? current ?? recommended;
  const focusTaskRow = run.tasks.find((task) => task.id === focusTask?.id);
  const selectTask = onTaskSelect ?? (() => undefined);
  const binding = run.repositoryBinding;
  const hasRepository = Boolean(binding?.githubRepositoryId);
  const hasPullRequest = hasRepository && binding?.pullNumber != null;
  const repositoryLabel = resolveRepositoryDisplayName(binding, run.proof?.facts);
  const pending = Boolean(run.pendingOperation);
  const isCurrent = focusTask?.id === run.currentTaskId;
  const commandError = [
    commands.start.error,
    commands.resume.error,
    commands.verify.error,
    commands.bindPullRequest.error,
  ].find(Boolean);
  const showError = Boolean(commandError && actionTaskId === focusTask?.id);
  const bindingDraft = focusTask
    ? (bindingDrafts[focusTask.id] ?? {
        pullNumber: binding?.pullNumber == null ? '' : String(binding.pullNumber),
      })
    : null;
  const actionPending =
    pending ||
    commands.start.isPending ||
    commands.resume.isPending ||
    commands.verify.isPending ||
    commands.bindPullRequest.isPending;

  const setBindingDraft = (patch: Partial<TaskDraft>) => {
    if (!focusTask || !bindingDraft) return;
    setBindingDrafts((previous) => ({
      ...previous,
      [focusTask.id]: { ...bindingDraft, ...patch },
    }));
  };
  const command = (taskId: string, operation: () => void) => {
    setActionTaskId(taskId);
    operation();
  };

  return (
    <article aria-label="현재 작업 문서" className="min-w-0 space-y-5">
      {run.pendingOperation ? (
        <p role="status" className="border-border bg-muted/70 rounded-xl border p-4 text-sm">
          결과를 확인하고 있습니다. 읽기와 작업 탐색은 계속할 수 있습니다.
        </p>
      ) : null}
      {focusTask ? (
        <section
          id={`task-document-${focusTask.id}`}
          className="border-border bg-surface-raised min-w-0 space-y-5 rounded-2xl border p-5 sm:p-7"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip state={focusTask.state} />
            <Badge variant="subtle" intent={focusTask.required ? 'neutral' : 'warning'}>
              {focusTask.required ? '필수 작업' : '선택 작업'}
            </Badge>
            {isCurrent ? (
              <Badge variant="subtle" intent="success">
                지금 할 작업
              </Badge>
            ) : null}
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">현재 작업</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{focusTask.title}</h2>
            <p className="text-muted-foreground mt-3 max-w-3xl leading-7">{focusTask.purpose}</p>
          </div>
          <section aria-labelledby={`outcome-${focusTask.id}`}>
            <h3 id={`outcome-${focusTask.id}`} className="text-sm font-bold">
              만들어야 할 결과
            </h3>
            <p className="text-muted-foreground mt-2 leading-6">
              {focusTask.outcome || '완료 기준을 확인해 결과를 준비하세요.'}
            </p>
          </section>
          <section aria-labelledby={`criteria-${focusTask.id}`}>
            <h3 id={`criteria-${focusTask.id}`} className="text-sm font-bold">
              완료 기준
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 leading-6">
              {focusTask.acceptanceCriteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby={`evidence-${focusTask.id}`}>
            <h3 id={`evidence-${focusTask.id}`} className="text-sm font-bold">
              필요한 증거
            </h3>
            {focusTask.evidenceRequirements.length ? (
              <ul className="mt-2 list-disc space-y-2 pl-5 leading-6">
                {focusTask.evidenceRequirements.map((requirement) => (
                  <li key={requirement}>{evidenceRequirementLabelKo(requirement)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">
                현재 알려진 증거 요건이 없습니다.
              </p>
            )}
          </section>
          {showError ? (
            <p
              role="alert"
              className="border-destructive bg-destructive/10 text-destructive rounded-xl border p-3 text-sm"
            >
              {commandErrorCopy(commandError)}
            </p>
          ) : null}
          <section
            aria-label="현재 작업 행동"
            className="border-border bg-surface rounded-xl border p-4"
          >
            {pending ? <p className="text-sm font-medium">결과 확인 중</p> : null}
            {!pending && run.state === 'ARCHIVED' ? (
              <p className="text-muted-foreground text-sm">
                보관된 프로젝트라서 작업을 변경할 수 없습니다.
              </p>
            ) : null}
            {!pending && run.state !== 'ARCHIVED' && !isCurrent ? (
              <p className="text-muted-foreground text-sm">
                이 작업은 여정을 살펴보기 위한 선택입니다. 현재 작업을 완료한 뒤 서버가 다음 행동을
                안내합니다.
              </p>
            ) : null}
            {!pending && run.state !== 'ARCHIVED' && isCurrent && focusTask.state === 'READY' ? (
              <Button
                className="min-h-11"
                disabled={actionPending}
                onClick={() =>
                  command(focusTask.id, () => commands.start.mutate({ taskId: focusTask.id }))
                }
              >
                작업 시작
              </Button>
            ) : null}
            {!pending &&
            run.state !== 'ARCHIVED' &&
            isCurrent &&
            focusTask.state === 'IN_PROGRESS' &&
            !hasRepository ? (
              <p className="text-muted-foreground text-sm">
                결과 확인 전에는 이 프로젝트에 연결된 저장소와 PR이 필요합니다. 현재 프로젝트에는
                저장소 연결 정보가 없습니다.
              </p>
            ) : null}
            {!pending &&
            run.state !== 'ARCHIVED' &&
            isCurrent &&
            focusTask.state === 'IN_PROGRESS' &&
            hasRepository &&
            !hasPullRequest &&
            bindingDraft ? (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  command(focusTask.id, () =>
                    commands.bindPullRequest.mutate({
                      githubRepositoryId: binding!.githubRepositoryId,
                      pullNumber: Number(bindingDraft.pullNumber),
                    }),
                  );
                }}
              >
                <p className="text-sm font-medium">이 프로젝트의 PR 연결</p>
                <p className="text-muted-foreground text-xs">
                  이 연결은 선택한 작업만이 아니라 프로젝트 전체의 검증 기준에 적용됩니다.
                </p>
                <p className="text-muted-foreground text-sm">
                  연결된 저장소:{' '}
                  <span className="font-medium">{repositoryLabel ?? '이 프로젝트의 저장소'}</span>
                </p>
                <Input
                  aria-label="PR 번호"
                  value={bindingDraft.pullNumber}
                  onChange={(event) => setBindingDraft({ pullNumber: event.target.value })}
                  inputMode="numeric"
                  pattern="[1-9][0-9]*"
                  required
                />
                <Button
                  className="min-h-11"
                  disabled={actionPending || !/^[1-9]\d*$/.test(bindingDraft.pullNumber)}
                >
                  PR 연결하기
                </Button>
              </form>
            ) : null}
            {!pending &&
            run.state !== 'ARCHIVED' &&
            isCurrent &&
            focusTask.state === 'IN_PROGRESS' &&
            hasPullRequest ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {repositoryLabel
                    ? `${repositoryLabel}의 PR #${binding?.pullNumber}이 프로젝트에 연결되어 있습니다.`
                    : '프로젝트 PR이 연결되어 있습니다.'}
                </p>
                <Button
                  className="min-h-11"
                  disabled={actionPending}
                  onClick={() =>
                    command(focusTask.id, () => commands.verify.mutate({ taskId: focusTask.id }))
                  }
                >
                  결과 확인 요청
                </Button>
              </div>
            ) : null}
            {!pending && run.state !== 'ARCHIVED' && isCurrent && focusTask.state === 'DEFERRED' ? (
              <Button
                className="min-h-11"
                disabled={actionPending}
                onClick={() =>
                  command(focusTask.id, () => commands.resume.mutate({ taskId: focusTask.id }))
                }
              >
                작업 재개
              </Button>
            ) : null}
            {!pending &&
            run.state !== 'ARCHIVED' &&
            isCurrent &&
            focusTask.state === 'VERIFYING' ? (
              <p className="text-muted-foreground text-sm">
                결과 확인 중입니다. 새 요청은 결과가 나온 뒤에 할 수 있습니다.
              </p>
            ) : null}
            {!pending && run.state !== 'ARCHIVED' && focusTask.state === 'DONE' ? (
              recommended && recommended.id !== focusTask.id ? (
                <Button
                  className="min-h-11"
                  variant="outline"
                  onClick={() => selectTask(recommended.id)}
                >
                  다음 작업 보기
                </Button>
              ) : (
                <p className="text-muted-foreground text-sm">
                  이 작업은 완료되었습니다. 공개 또는 공유 상태는 별도로 확인해야 합니다.
                </p>
              )
            ) : null}
            {!pending && run.state !== 'ARCHIVED' && focusTask.state === 'LOCKED' ? (
              <p className="text-muted-foreground text-sm">
                {prerequisiteTitles(model, focusTask.id).length
                  ? `먼저 완료할 작업: ${prerequisiteTitles(model, focusTask.id).join(', ')}`
                  : '선행 조건을 확인한 뒤 다시 시도하세요.'}
              </p>
            ) : null}
            {!pending && run.state !== 'ARCHIVED' && isCurrent && focusTask.state === 'BLOCKED' ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {focusTaskRow?.verificationFailure?.note ??
                    '막힘 사유를 해결한 뒤 최신 상태에서 재개할 수 있습니다.'}
                </p>
                <Button
                  className="min-h-11"
                  disabled={actionPending}
                  onClick={() =>
                    command(focusTask.id, () => commands.resume.mutate({ taskId: focusTask.id }))
                  }
                >
                  작업 재개
                </Button>
              </div>
            ) : null}
          </section>
        </section>
      ) : (
        <p className="border-border bg-surface rounded-xl border p-5 text-sm">
          지금 표시할 작업이 없습니다. 프로젝트 상태를 새로고침해 주세요.
        </p>
      )}
    </article>
  );
}
