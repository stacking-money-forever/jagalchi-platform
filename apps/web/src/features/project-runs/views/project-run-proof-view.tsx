'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useProjectRunCommands } from '../hooks/use-project-run-commands';
import {
  publicationLabelKo,
  resolveRepositoryDisplayName,
  verificationLabelKo,
} from '../projection';

import type { ProjectRunProjection } from '@jagalchi/api-client';

const criterionLabels: Record<string, string> = {
  MERGED_PR: 'PR 병합',
  BASE_BRANCH: '기준 브랜치',
  CHANGED_PATH: '변경 경로',
  NAMED_CHECK: '지정된 검사',
};

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function resultLabel(state: 'PENDING' | 'PASS' | 'FAIL' | 'STALE'): string {
  if (state === 'PASS') return '검증을 통과했습니다';
  if (state === 'FAIL') return '검증 조건을 모두 통과하지 못했습니다';
  if (state === 'STALE') return '검증 결과를 다시 확인해야 합니다';
  return '검증 결과를 확인하는 중입니다';
}

function PublicationAction({ run }: { run: ProjectRunProjection }) {
  const commands = useProjectRunCommands(run);
  const proof = run.proof;
  if (!proof || run.pendingOperation) return null;

  if (proof.publication.state === 'ACTIVE') {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={commands.unpublish.isPending}
        onClick={() => commands.unpublish.mutate()}
      >
        이 실행의 발행 취소
      </Button>
    );
  }
  if (proof.verification.state === 'PASS' && proof.publication.state === 'UNPUBLISHED') {
    return (
      <Button
        size="sm"
        disabled={commands.publish.isPending}
        onClick={() => commands.publish.mutate()}
      >
        이 실행 발행 요청
      </Button>
    );
  }
  if (proof.verification.state === 'FAIL' || proof.verification.state === 'STALE') {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={commands.reverify.isPending}
        onClick={() => commands.reverify.mutate()}
      >
        재검증 요청
      </Button>
    );
  }
  return null;
}

export function ProjectRunProofView({ run }: { run: ProjectRunProjection }) {
  const commands = useProjectRunCommands(run);
  const proof = run.proof;
  const binding = run.repositoryBinding;
  const facts = proof?.facts;
  const repositoryDisplayName = resolveRepositoryDisplayName(binding, facts);
  const bindingSource = (binding?.githubRepositoryId ?? '') + ':' + (binding?.pullNumber ?? '');
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

  return (
    <div className="space-y-6">
      {run.pendingOperation ? (
        <section
          className="border-border bg-muted/40 rounded-xl border p-4"
          aria-label="진행 중인 작업"
        >
          <p className="text-sm font-bold">서버 작업 진행 중</p>
          <p className="text-muted-foreground mt-1 text-xs">
            완료 후 최신 실행 상태가 반영됩니다. 이 화면에서는 추가 발행 또는 재검증 요청을 보낼 수
            없습니다.
          </p>
          <details className="mt-3 text-xs">
            <summary className="text-muted-foreground cursor-pointer">기술 세부 정보</summary>
            <p className="text-muted-foreground mt-2 font-mono break-all">
              {run.pendingOperation.id}
            </p>
            <p className="text-muted-foreground mt-1">종류: {run.pendingOperation.kind}</p>
          </details>
        </section>
      ) : null}

      {!proof ? (
        <section className="border-border rounded-xl border p-4" aria-label="Proof 결과 없음">
          <h2 className="text-sm font-bold">아직 확인된 실행 결과가 없습니다</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            프로젝트 실행에서 검증이 완료되면 결과, 조건, 발행 상태가 여기에 표시됩니다.
          </p>
        </section>
      ) : (
        <>
          <section className="border-border rounded-xl border p-4" aria-label="실행 결과 요약">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold">실행 결과</h2>
              <Badge variant="subtle" intent="neutral">
                {verificationLabelKo(proof.verification.state)}
              </Badge>
            </div>
            <p className="mt-3 text-base font-semibold">{resultLabel(proof.verification.state)}</p>
            <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
              {proof.summary || '이 실행에 대한 추가 설명은 아직 기록되지 않았습니다.'}
            </p>
            {facts?.provider === 'fixture' ? (
              <p
                className="border-warning/40 bg-warning/10 mt-4 rounded-lg border p-3 text-sm"
                role="note"
                aria-label="fixture 한계"
              >
                이 결과는 로컬 fixture 예시입니다. 내 작업의 실패가 아니며, 실제 GitHub 검증 또는
                공개 증명도 아닙니다.
              </p>
            ) : null}
          </section>

          <section className="border-border rounded-xl border p-4" aria-label="검증 조건과 출처">
            <h2 className="text-sm font-bold">검증 조건과 출처</h2>
            {facts ? (
              <>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold">검증 출처</dt>
                    <dd>{facts.provider === 'fixture' ? '로컬 fixture 예시' : 'GitHub'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold">확인 시각</dt>
                    <dd>{formatDateTime(facts.observedAt) ?? '기록된 시각 없음'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold">검증 완료 시각</dt>
                    <dd>{formatDateTime(proof.verification.verifiedAt) ?? '아직 완료되지 않음'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold">연결된 저장소</dt>
                    <dd>{repositoryDisplayName ?? facts.repositoryName ?? '기록된 저장소 없음'}</dd>
                  </div>
                </dl>
                {facts.evaluations.length > 0 ? (
                  <ul
                    className="border-border mt-4 divide-y rounded-lg border"
                    aria-label="검증 조건 결과"
                  >
                    {facts.evaluations.map((evaluation, index) => (
                      <li
                        key={evaluation.ruleId}
                        className="flex items-center justify-between gap-3 p-3 text-sm"
                      >
                        <p className="font-medium">
                          {criterionLabels[evaluation.type] ?? '검증 조건'} {index + 1}
                        </p>
                        <Badge
                          variant="subtle"
                          intent={evaluation.passed ? 'success' : 'destructive'}
                        >
                          {evaluation.passed ? '통과' : '보완 필요'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground mt-3 text-sm">
                    아직 표시할 검증 조건이 없습니다.
                  </p>
                )}
                <details className="border-border mt-4 border-t pt-3 text-xs">
                  <summary className="text-muted-foreground cursor-pointer">기술 세부 정보</summary>
                  <dl className="text-muted-foreground mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt>스냅샷</dt>
                      <dd className="font-mono break-all">{facts.snapshotId}</dd>
                    </div>
                    <div>
                      <dt>검증 수준</dt>
                      <dd>{facts.verificationLevel}</dd>
                    </div>
                    <div>
                      <dt>저장소 ID</dt>
                      <dd className="font-mono break-all">{facts.repositoryId}</dd>
                    </div>
                    <div>
                      <dt>PR / SHA</dt>
                      <dd className="font-mono break-all">
                        #{facts.pullNumber} · {facts.headSha}
                      </dd>
                    </div>
                  </dl>
                  {facts.pullUrl ? (
                    <a
                      className="text-primary mt-2 inline-block underline"
                      href={facts.pullUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      연결된 PR 열기
                    </a>
                  ) : null}
                </details>
              </>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">
                기계 검증 사실이 아직 기록되지 않았습니다.
              </p>
            )}
          </section>

          <section className="border-border rounded-xl border p-4" aria-label="설명 범위">
            <h2 className="text-sm font-bold">설명 범위</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              위 설명과 조건은 이 프로젝트 실행에만 적용됩니다. 계정 전체 Proof Profile의 소개,
              활성화 상태, 다른 공개 결과는 이 실행과 별도로 관리됩니다.
            </p>
            <a className="text-primary mt-3 inline-block text-sm underline" href="/profile">
              계정 프로필 관리로 이동
            </a>
          </section>

          <section className="border-border rounded-xl border p-4" aria-label="실행 발행 상태">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold">실행 발행 상태</h2>
              <Badge variant="subtle" intent="neutral">
                {publicationLabelKo(proof.publication.state)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              이 상태는 이 프로젝트 실행의 발행 기록입니다. 계정 Proof Profile 활성화, lease 유효성,
              또는 공개 리소스의 존재를 뜻하지 않습니다.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              현재 실행의 발행 ID와 공개 Proof Profile 목적지의 연결은 확인되지 않았습니다. 따라서
              공유 링크나 공개 리소스를 제공하지 않습니다.
            </p>
            {proof.validUntil ? (
              <p className="text-muted-foreground mt-2 text-xs">
                실행 기록의 유효 기한: {formatDateTime(proof.validUntil) ?? proof.validUntil}
              </p>
            ) : null}
            <div className="mt-4">
              <PublicationAction run={run} />
            </div>
          </section>
        </>
      )}

      <section className="border-border rounded-xl border p-4" aria-label="프로젝트 실행 PR 바인딩">
        <h2 className="text-sm font-bold">프로젝트 실행 PR 바인딩</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          이 연결은 선택한 개별 작업이 아니라 프로젝트 실행 전체에 적용됩니다. 작업마다 다른 PR을
          별도로 연결할 수 있다는 의미는 아닙니다.
        </p>
        {binding ? (
          <>
            <p className="mt-3 text-sm">
              현재 연결: {repositoryDisplayName ?? '저장소'} · PR #{binding.pullNumber ?? '없음'}
            </p>
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
                GitHub 저장소 ID
                <input
                  className="border-input bg-background h-10 rounded-md border px-3 text-sm"
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
                  className="border-input bg-background h-10 rounded-md border px-3 text-sm"
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
                프로젝트 실행 PR 저장
              </Button>
            </form>
            {commands.bindPullRequest.error ? (
              <p className="text-destructive mt-2 text-xs" role="alert">
                PR 바인딩에 실패했습니다. 최신 상태를 불러온 뒤 다시 시도해 주세요.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">
            이 실행에는 저장소 바인딩 정보가 없습니다. 실행 생성 시 지원되는 저장소 연결을 먼저
            확인해 주세요.
          </p>
        )}
      </section>
    </div>
  );
}
