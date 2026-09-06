'use client';

import { useMemo, useState } from 'react';

import { nanoid } from 'nanoid';

import { getOwnerProofProfile, updateOwnerProofProfile } from '@/api/proof-profile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { useProjectRunCommands } from '../hooks/use-project-run-commands';
import { projectRunTaskHref } from '../presentation-state';
import {
  publicationLabelKo,
  resolveRepositoryDisplayName,
  verificationLabelKo,
} from '../projection';

import type { ProjectRunProjection } from '@jagalchi/api-client';

function formatSnapshotId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

function taskIdsForRule(run: ProjectRunProjection, ruleId: string): string[] {
  const index = Number(ruleId.match(/(\d+)$/)?.[1] ?? '-1');
  if (!Number.isInteger(index) || index < 0) return [];
  return run.tasks
    .filter((task) => task.evidenceRequirements[index] !== undefined)
    .map((task) => task.id);
}

function proofFactTaskIds(
  run: ProjectRunProjection,
  taskKey: string | null | undefined,
  ruleIds: readonly string[],
): string[] {
  if (taskKey && run.tasks.some((task) => task.id === taskKey)) return [taskKey];
  return [...new Set(ruleIds.flatMap((ruleId) => taskIdsForRule(run, ruleId)))];
}

function TaskRequirementLinks({
  run,
  taskIds,
  label = '로드맵 연결',
}: {
  run: ProjectRunProjection;
  taskIds: readonly string[];
  label?: string;
}) {
  const citationsById = useMemo(
    () => new Map((run.citations ?? []).map((citation) => [citation.id, citation.label])),
    [run.citations],
  );
  if (taskIds.length === 0) {
    return <span className="text-muted-foreground">로드맵 작업 연결 없음</span>;
  }
  return (
    <div className="mt-2 space-y-1">
      <p className="text-muted-foreground text-[11px] font-bold">{label}</p>
      {taskIds.map((taskId) => {
        const task = run.tasks.find((candidate) => candidate.id === taskId);
        if (!task) return null;
        return (
          <div key={taskId} className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            <a
              className="text-primary underline"
              href={projectRunTaskHref(run.id, task.id)}
              aria-label={`로드맵 작업으로 이동: ${task.title}`}
            >
              작업: {task.title}
            </a>
            {(task.citationIds ?? []).map((citationId) => {
              const label = citationsById.get(citationId);
              return label ? (
                <a
                  key={citationId}
                  className="text-primary underline"
                  href={projectRunTaskHref(run.id, task.id)}
                  aria-label={`인용 요구사항으로 이동: ${label}`}
                >
                  요구사항: {label}
                </a>
              ) : null;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function ProjectRunProofView({ run }: { run: ProjectRunProjection }) {
  const commands = useProjectRunCommands(run);
  const proof = run.proof;
  const binding = run.repositoryBinding;
  const facts = proof?.facts;
  const repositoryDisplayName = resolveRepositoryDisplayName(binding, facts);
  const narrativeSource = proof?.summary ?? '';
  const [narrativeDraft, setNarrativeDraft] = useState<{
    source: string;
    value: string;
  } | null>(null);
  const narrative =
    narrativeDraft?.source === narrativeSource ? narrativeDraft.value : narrativeSource;
  const [narrativeState, setNarrativeState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const bindingSource = `${binding?.githubRepositoryId ?? ''}:${binding?.pullNumber ?? ''}`;
  const [bindingDraft, setBindingDraft] = useState<{
    source: string;
    repositoryId: string;
    pullNumber: string;
  } | null>(null);
  const repositoryId =
    bindingDraft?.source === bindingSource
      ? bindingDraft.repositoryId
      : (binding?.githubRepositoryId ?? '');
  const pullNumber =
    bindingDraft?.source === bindingSource
      ? bindingDraft.pullNumber
      : binding?.pullNumber == null
        ? ''
        : String(binding.pullNumber);

  const failedCriteria =
    proof?.failedCriteria ??
    facts?.evaluations
      ?.filter((evaluation) => !evaluation.passed)
      .map((evaluation) => ({
        ruleId: evaluation.ruleId,
        type: evaluation.type,
        code: evaluation.code,
      })) ??
    [];
  const factTaskIds = proofFactTaskIds(
    run,
    facts?.taskKey,
    facts?.evaluations?.map((evaluation) => evaluation.ruleId) ??
      failedCriteria.map((item) => item.ruleId),
  );

  const saveNarrative = async () => {
    setNarrativeState('saving');
    setNarrativeError(null);
    try {
      const profile = await getOwnerProofProfile();
      if (!profile) throw new Error('Proof Profile이 없어 서술을 저장할 수 없습니다.');
      await updateOwnerProofProfile({
        state: profile.state,
        displayName: profile.displayName,
        summary: narrative.trim() || null,
        idempotencyKey: nanoid(),
      });
      setNarrativeState('saved');
    } catch (error) {
      setNarrativeState('error');
      setNarrativeError(error instanceof Error ? error.message : '서술을 저장하지 못했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {run.pendingOperation ? (
        <section
          className="border-border bg-muted/40 rounded-xl border p-4"
          aria-label="진행 중인 작업"
        >
          <p className="text-sm font-bold">검증 작업 진행 중</p>
          <p className="text-muted-foreground mt-1 font-mono text-xs">{run.pendingOperation.id}</p>
          <p className="text-muted-foreground mt-1 text-xs">종류: {run.pendingOperation.kind}</p>
        </section>
      ) : null}

      <section
        role="region"
        aria-label="저장소 바인딩"
        className="border-border rounded-xl border p-4"
      >
        <h2 className="text-sm font-bold">저장소 바인딩</h2>
        {binding ? (
          <>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs font-bold">저장소</dt>
                <dd>{repositoryDisplayName ?? binding.githubRepositoryId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs font-bold">PR</dt>
                <dd>{binding.pullNumber != null ? `#${binding.pullNumber}` : '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-xs font-bold">HEAD SHA</dt>
                <dd className="font-mono text-xs break-all">{binding.headSha ?? '—'}</dd>
              </div>
              {binding.pullUrl ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs font-bold">Pull URL</dt>
                  <dd>
                    <a
                      href={binding.pullUrl}
                      className="text-primary underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {binding.pullUrl}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
            <form
              className="border-border mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                commands.bindPullRequest.mutate({
                  githubRepositoryId: repositoryId,
                  pullNumber: Number(pullNumber),
                });
              }}
            >
              <label className="grid gap-1 text-xs font-bold">
                GitHub 저장소
                <input
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  value={repositoryId}
                  onChange={(event) =>
                    setBindingDraft({
                      source: bindingSource,
                      repositoryId: event.target.value,
                      pullNumber,
                    })
                  }
                  inputMode="numeric"
                  pattern="[1-9][0-9]*"
                  required
                />
              </label>
              <label className="grid gap-1 text-xs font-bold">
                PR 번호
                <input
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  value={pullNumber}
                  onChange={(event) =>
                    setBindingDraft({
                      source: bindingSource,
                      repositoryId,
                      pullNumber: event.target.value,
                    })
                  }
                  inputMode="numeric"
                  type="number"
                  min={1}
                  required
                />
              </label>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={
                  commands.bindPullRequest.isPending ||
                  Boolean(run.pendingOperation) ||
                  !/^[1-9]\d*$/.test(repositoryId) ||
                  !/^[1-9]\d*$/.test(pullNumber)
                }
              >
                PR 바인딩
              </Button>
            </form>
            {commands.bindPullRequest.error ? (
              <p className="text-destructive mt-2 text-xs" role="alert">
                PR 바인딩에 실패했습니다. 최신 상태를 불러온 뒤 다시 시도해 주세요.
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-2 space-y-2 text-sm" role="status">
            <p className="text-muted-foreground">바인딩 정보가 없습니다.</p>
            <p className="text-muted-foreground text-xs">
              프로젝트 실행 생성 시 저장소를 연결하면 PR을 바인딩할 수 있습니다.
            </p>
          </div>
        )}
      </section>

      {!proof ? (
        <p className="text-muted-foreground text-sm" role="status" aria-label="Proof 미수집">
          Proof 데이터가 아직 없습니다.
        </p>
      ) : (
        <>
          <section
            role="region"
            aria-label="Proof 사실"
            className="border-border rounded-xl border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold">검증·발행 상태</h2>
              <Badge variant="subtle" intent="neutral">
                검증 {verificationLabelKo(proof.verification.state)}
              </Badge>
              <Badge variant="subtle" intent="neutral">
                발행 {publicationLabelKo(proof.publication.state)}
              </Badge>
              {proof.validUntil ? (
                <span className="text-muted-foreground text-xs">유효 기한 {proof.validUntil}</span>
              ) : null}
              {formatSnapshotId(proof.publication.supersededSnapshotId) ? (
                <span className="text-muted-foreground text-xs">
                  대체된 스냅샷 {formatSnapshotId(proof.publication.supersededSnapshotId)}
                </span>
              ) : null}
            </div>

            {facts ? (
              <div className="mt-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold">스냅샷</dt>
                    <dd className="font-mono text-xs">{facts.snapshotId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold">검증 수준</dt>
                    <dd>{facts.verificationLevel}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold">검증 출처</dt>
                    <dd>{facts.provider === 'fixture' ? '로컬 fixture' : 'GitHub'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold">저장소</dt>
                    <dd>{facts.repositoryName ?? facts.repositoryId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold">PR / SHA</dt>
                    <dd>
                      #{facts.pullNumber} ·{' '}
                      <span className="font-mono text-xs">{facts.headSha}</span>
                    </dd>
                  </div>
                </dl>
                {facts.provider === 'fixture' ? (
                  <p
                    className="text-muted-foreground mt-3 text-xs leading-5"
                    role="note"
                    aria-label="검증 출처 안내"
                  >
                    로컬 fixture 사실을 기준으로 검증했습니다. 실제 GitHub 검증 결과가 아닙니다.
                  </p>
                ) : null}
                <TaskRequirementLinks run={run} taskIds={factTaskIds} label="사실의 로드맵 근거" />
                {facts.pullUrl ? (
                  <p className="mt-2 text-xs">
                    <a
                      href={facts.pullUrl}
                      className="text-primary underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pull URL
                    </a>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">기계 검증 사실이 아직 없습니다.</p>
            )}

            {failedCriteria.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <h3 className="text-sm font-bold">실패한 기준</h3>
                <table className="mt-2 w-full text-left text-xs">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="p-2 font-bold">규칙</th>
                      <th className="p-2 font-bold">유형</th>
                      <th className="p-2 font-bold">코드</th>
                      <th className="p-2 font-bold">근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedCriteria.map((evaluation) => {
                      const taskIds = taskIdsForRule(run, evaluation.ruleId);
                      return (
                        <tr key={evaluation.ruleId} className="border-border border-b">
                          <td className="p-2 font-mono">{evaluation.ruleId}</td>
                          <td className="p-2">{evaluation.type}</td>
                          <td className="p-2 font-mono">{evaluation.code}</td>
                          <td className="p-2">
                            <TaskRequirementLinks run={run} taskIds={taskIds} label="" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {facts && facts.evaluations && facts.evaluations.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <h3 className="text-sm font-bold">규칙별 결과</h3>
                <table className="mt-2 w-full text-left text-xs">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="p-2 font-bold">규칙</th>
                      <th className="p-2 font-bold">유형</th>
                      <th className="p-2 font-bold">결과</th>
                      <th className="p-2 font-bold">코드</th>
                      <th className="p-2 font-bold">근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facts.evaluations.map((evaluation) => (
                      <tr key={evaluation.ruleId} className="border-border border-b">
                        <td className="p-2 font-mono">{evaluation.ruleId}</td>
                        <td className="p-2">{evaluation.type}</td>
                        <td className="p-2">{evaluation.passed ? '통과' : '실패'}</td>
                        <td className="p-2 font-mono">{evaluation.code}</td>
                        <td className="p-2">
                          <TaskRequirementLinks
                            run={run}
                            taskIds={taskIdsForRule(run, evaluation.ruleId)}
                            label=""
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={commands.publish.isPending}
                onClick={() => commands.publish.mutate()}
              >
                발행
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={commands.unpublish.isPending}
                onClick={() => commands.unpublish.mutate()}
              >
                발행 취소
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={commands.reverify.isPending || Boolean(run.pendingOperation)}
                onClick={() => commands.reverify.mutate()}
              >
                재검증
              </Button>
            </div>
          </section>

          <section
            aria-label="Proof 서술"
            className="border-border bg-muted/30 rounded-xl border p-4"
          >
            <h2 className="text-sm font-bold">서술 (Narrative)</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              이 서술은 immutable 검증 사실과 분리된 owner Proof Profile presentation
              revision입니다.
            </p>
            <Textarea
              value={narrative}
              onChange={(event) => {
                setNarrativeDraft({ source: narrativeSource, value: event.target.value });
                setNarrativeState('idle');
              }}
              aria-label="지원 서술 편집"
              textareaSize="lg"
              className="mt-3"
            />
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" disabled={narrativeState === 'saving'} onClick={saveNarrative}>
                {narrativeState === 'saving' ? '저장 중' : '서술 저장'}
              </Button>
              {narrativeState === 'saved' ? (
                <span className="text-success text-xs">저장됨</span>
              ) : null}
            </div>
            {narrativeError ? (
              <p role="alert" className="text-destructive mt-2 text-xs">
                {narrativeError}
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
