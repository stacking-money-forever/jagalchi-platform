'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import {
  useCareerReviews,
  useProofReviews,
  useReviewCareerEvidence,
  useReviewProofMission,
} from './use-career';

const RUN_STATUS_LABELS = {
  PASS: '통과',
  FAIL: '불통과',
  ERROR: '확인 오류',
} as const;

const CRITERION_LABELS = {
  MERGED_PR: 'PR 병합 완료',
  BASE_BRANCH: '기준 브랜치 일치',
  CHANGED_PATH: '변경 경로 포함',
  NAMED_CHECK: '필수 검사 통과',
  HUMAN_CHECK: '리뷰어 확인 항목',
} as const;

function formatObservedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function CareerReviewQueue() {
  const reviews = useCareerReviews();
  const proofReviews = useProofReviews();
  const reviewEvidence = useReviewCareerEvidence();
  const reviewProofMission = useReviewProofMission();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [proofNotes, setProofNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [proofError, setProofError] = useState<{ missionId: string; message: string } | null>(null);

  const submitReview = async (evidenceId: string, status: 'VERIFIED' | 'REJECTED') => {
    setError(null);
    const reviewNote = notes[evidenceId]?.trim();
    if (status === 'REJECTED' && !reviewNote) {
      setError('보완 요청에는 학습자가 수정할 수 있는 이유를 입력해주세요.');
      return;
    }
    try {
      await reviewEvidence.mutateAsync({ evidenceId, status, reviewNote: reviewNote || undefined });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '증거 검토를 저장하지 못했습니다.');
    }
  };

  const submitProofReview = async (missionId: string, decision: 'APPROVED' | 'RETURNED') => {
    setProofError(null);
    const note = proofNotes[missionId]?.trim();
    if (decision === 'RETURNED' && !note) {
      setProofError({
        missionId,
        message: '보완 요청에는 소유자가 다음 행동을 알 수 있는 메모를 입력해주세요.',
      });
      return;
    }
    try {
      await reviewProofMission.mutateAsync({
        missionId,
        decision,
        note: note || undefined,
      });
      setProofNotes((current) => {
        const next = { ...current };
        delete next[missionId];
        return next;
      });
    } catch (reason) {
      setProofError({
        missionId,
        message: reason instanceof Error ? reason.message : '증명 미션 검토를 저장하지 못했습니다.',
      });
    }
  };

  return (
    <AppShell activeTab="career">
      <div className="mx-auto w-full max-w-4xl">
        <header>
          <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
            <Link href="/career">
              <ArrowLeft aria-hidden="true" />
              Career Diff로 돌아가기
            </Link>
          </Button>
          <p className="text-primary text-xs font-extrabold">REVIEWER WORKSPACE</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            결과물 검증 대기열
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
            링크의 실제 내용과 제출자가 설명한 문제·결과를 확인한 뒤 검증하거나 보완을 요청하세요.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="proof-review-heading">
          <div>
            <p className="text-primary text-xs font-extrabold">PROOF MISSION</p>
            <h2 id="proof-review-heading" className="mt-2 text-xl font-extrabold">
              증명 미션 검토
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              제출 당시 고정된 실행과 기준별 결과를 확인하고 승인하거나 보완을 요청하세요.
            </p>
          </div>

          {proofReviews.isLoading ? (
            <p className="text-muted-foreground mt-5 text-sm" role="status">
              증명 미션 대기열을 불러오는 중입니다.
            </p>
          ) : proofReviews.isError ? (
            <div
              className="border-error/30 bg-error-subtle mt-5 rounded-2xl border p-6"
              role="alert"
            >
              <h3 className="text-error font-extrabold">증명 미션 대기열을 불러오지 못했습니다.</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                잠시 후 다시 시도하거나 검토 권한을 확인해주세요.
              </p>
            </div>
          ) : proofReviews.data?.length ? (
            <div className="mt-5 space-y-5">
              {proofReviews.data.map((mission) => {
                const run = mission.currentVerificationRun;
                const canDecide = run?.status === 'PASS';
                const configuredCriteriaByPositionAndType = new Map(
                  mission.criteria.map((criterion) => [
                    `${criterion.position}:${criterion.type}`,
                    criterion,
                  ]),
                );
                const displayedCriteria =
                  run?.results.map((result) => ({
                    result,
                    configured: configuredCriteriaByPositionAndType.get(
                      `${result.position}:${result.type}`,
                    ),
                  })) ?? [];
                const hasHumanChecks = displayedCriteria.some(
                  ({ result }) => result.type === 'HUMAN_CHECK',
                );
                const noteError =
                  proofError?.missionId === mission.id ? proofError.message : undefined;
                const noteErrorId = `proof-review-note-error-${mission.id}`;

                return (
                  <article
                    key={mission.id}
                    className="border-border bg-card rounded-2xl border p-5 sm:p-6"
                    aria-labelledby={`proof-review-title-${mission.id}`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-sm">
                          미션 소유자{' '}
                          <strong className="text-foreground">{mission.ownerDisplayName}</strong>
                        </p>
                        <p className="text-primary mt-2 text-xs font-extrabold">
                          목표 역량 · {mission.competencyLabel}
                        </p>
                        <h3
                          id={`proof-review-title-${mission.id}`}
                          className="mt-1 text-lg font-extrabold"
                        >
                          {mission.title}
                        </h3>
                        {mission.summary ? (
                          <p className="text-muted-foreground mt-2 text-sm leading-6">
                            {mission.summary}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <section
                      className="bg-muted/40 mt-5 rounded-2xl p-4"
                      aria-label="제출 당시 고정된 검증 실행"
                    >
                      <h4 className="text-sm font-extrabold">고정 실행 결과</h4>
                      {run ? (
                        <>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="font-bold">{RUN_STATUS_LABELS[run.status]}</span>
                            <span className="text-muted-foreground text-xs">
                              관찰 시각{' '}
                              <time dateTime={run.observedAt}>
                                {formatObservedAt(run.observedAt)}
                              </time>
                            </span>
                          </div>
                          {displayedCriteria.length ? (
                            <ol className="mt-4 space-y-2" aria-label="기준별 검증 결과">
                              {displayedCriteria.map(({ result, configured }) => {
                                const isHumanCheck = result.type === 'HUMAN_CHECK';

                                return (
                                  <li
                                    key={`${result.position}:${result.type}`}
                                    className={
                                      isHumanCheck
                                        ? 'border-primary/30 bg-primary-subtle/30 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm'
                                        : 'border-border bg-background flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm'
                                    }
                                  >
                                    <span>
                                      {result.position + 1}.{' '}
                                      {isHumanCheck
                                        ? configured?.config.label
                                        : CRITERION_LABELS[result.type]}
                                    </span>
                                    <span
                                      className={
                                        isHumanCheck
                                          ? 'text-primary font-bold'
                                          : result.passed
                                            ? 'text-success font-bold'
                                            : 'text-error font-bold'
                                      }
                                    >
                                      {isHumanCheck
                                        ? '사람 확인 필요'
                                        : result.passed
                                          ? '통과'
                                          : '불통과'}
                                    </span>
                                  </li>
                                );
                              })}
                            </ol>
                          ) : (
                            <p className="text-muted-foreground mt-3 text-sm">
                              표시할 기준 결과가 없습니다.
                            </p>
                          )}
                          {hasHumanChecks ? (
                            <p className="text-muted-foreground mt-3 text-xs leading-5">
                              승인은 위에 표시된 모든 사람 확인 항목을 직접 확인했음을 뜻합니다.
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-error mt-2 text-sm font-semibold">
                          검토할 고정 실행 결과가 없습니다.
                        </p>
                      )}
                    </section>

                    <label className="mt-5 block space-y-2">
                      <span className="text-sm font-bold">검토 메모</span>
                      <span className="text-muted-foreground block text-xs">
                        보완 요청 시 소유자가 바로 수정할 수 있도록 반드시 입력해주세요.
                      </span>
                      <Textarea
                        value={proofNotes[mission.id] ?? ''}
                        onChange={(event) => {
                          setProofNotes((current) => ({
                            ...current,
                            [mission.id]: event.target.value,
                          }));
                          if (proofError?.missionId === mission.id) setProofError(null);
                        }}
                        placeholder="확인한 기준 또는 필요한 수정 행동을 구체적으로 적어주세요."
                        maxLength={1_000}
                        aria-invalid={noteError ? true : undefined}
                        aria-describedby={noteError ? noteErrorId : undefined}
                      />
                    </label>
                    {noteError ? (
                      <p
                        id={noteErrorId}
                        className="text-error mt-2 text-sm font-semibold"
                        role="alert"
                      >
                        {noteError}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        intent="destructive"
                        variant="outline"
                        onClick={() => void submitProofReview(mission.id, 'RETURNED')}
                        disabled={reviewProofMission.isPending || !canDecide}
                      >
                        <RotateCcw aria-hidden="true" className="size-4" />
                        보완 요청
                      </Button>
                      <Button
                        intent="success"
                        onClick={() => void submitProofReview(mission.id, 'APPROVED')}
                        disabled={reviewProofMission.isPending || !canDecide}
                      >
                        <CheckCircle2 aria-hidden="true" className="size-4" />
                        {hasHumanChecks ? '사람 확인 항목 포함 승인' : '승인'}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="border-border bg-muted/40 mt-5 rounded-2xl border border-dashed p-8 text-center">
              <ShieldCheck aria-hidden="true" className="text-success mx-auto size-8" />
              <h3 className="mt-4 font-extrabold">대기 중인 증명 미션이 없습니다.</h3>
              <p className="text-muted-foreground mt-1 text-sm">모든 미션을 확인했습니다.</p>
            </div>
          )}
        </section>

        <div className="mt-10">
          <h2 id="legacy-review-heading" className="text-xl font-extrabold">
            기존 결과물 검토
          </h2>
        </div>
        {reviews.isLoading ? (
          <p className="text-muted-foreground mt-8 text-sm">검증 대기열을 불러오는 중입니다.</p>
        ) : reviews.isError ? (
          <section className="border-error/30 bg-error-subtle mt-8 rounded-2xl border p-6">
            <h2 className="text-error font-extrabold">검증 대기열에 접근할 수 없습니다.</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              REVIEWER, TEACHER 또는 ADMIN 권한이 있는 계정만 사용할 수 있습니다.
            </p>
          </section>
        ) : reviews.data?.length ? (
          <div className="mt-8 space-y-5">
            {reviews.data.map((item) => (
              <article
                key={item.id}
                className="border-border bg-card rounded-2xl border p-5 sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {item.competencySlugs.map((slug) => (
                        <span
                          key={slug}
                          className="bg-primary-subtle text-primary rounded-full px-2.5 py-1 text-xs font-bold"
                        >
                          {slug}
                        </span>
                      ))}
                    </div>
                    <h2 className="mt-3 text-lg font-extrabold">{item.title}</h2>
                    {item.description ? (
                      <p className="text-muted-foreground mt-2 text-sm leading-6">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="border-border bg-background hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold outline-none focus-visible:ring-2"
                  >
                    결과물 열기
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                </div>

                <label className="mt-5 block space-y-2">
                  <span className="text-sm font-bold">검토 메모</span>
                  <Textarea
                    value={notes[item.id] ?? ''}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    placeholder="확인한 기준이나 보완할 부분을 구체적으로 적어주세요."
                    maxLength={1_000}
                  />
                </label>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    intent="destructive"
                    variant="outline"
                    onClick={() => void submitReview(item.id, 'REJECTED')}
                    disabled={reviewEvidence.isPending}
                  >
                    <XCircle aria-hidden="true" className="size-4" />
                    보완 요청
                  </Button>
                  <Button
                    intent="success"
                    onClick={() => void submitReview(item.id, 'VERIFIED')}
                    disabled={reviewEvidence.isPending}
                  >
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    검증 완료
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="border-border bg-muted/40 mt-8 rounded-2xl border border-dashed p-10 text-center">
            <ShieldCheck aria-hidden="true" className="text-success mx-auto size-8" />
            <h2 className="mt-4 font-extrabold">대기 중인 결과물이 없습니다.</h2>
            <p className="text-muted-foreground mt-1 text-sm">모든 제출물을 확인했습니다.</p>
          </section>
        )}

        {error ? (
          <p className="text-error mt-5 text-sm font-semibold" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
