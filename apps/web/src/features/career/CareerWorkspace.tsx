'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { CircleDashed, Clock3, ExternalLink, FileCheck2, ShieldCheck, Target } from 'lucide-react';

import type {
  CareerDiffStatus,
  ProofCriterionConfig,
  ProofCriterionType,
  ProofMission,
} from '@/api/career';
import type { OwnerProofProfile } from '@/api/proof-profile';
import { AppShell } from '@/components/app-shell/app-shell';
import { Button } from '@/components/ui/button';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { capture } from '@/lib/analytics/client';
import { cn } from '@/lib/utils';

import { CareerEvidenceForm } from './CareerEvidenceForm';
import { CareerTargetForm } from './CareerTargetForm';
import { GithubProofPicker } from './GithubProofPicker';
import {
  ProofCriteriaEditor,
  type ProofCriterion as ProofCriterionDraft,
} from './ProofCriteriaEditor';
import { ProofMissionPanel } from './ProofMissionPanel';
import { ProofProfileSettings } from './ProofProfileSettings';
import {
  useBindProofMission,
  useCareerCompetencies,
  useCareerDiff,
  useCareerEvidence,
  useCareerTargets,
  useCreateCareerEvidence,
  useCreateProofMission,
  useCreateCareerTarget,
  useOwnerProofProfile,
  usePublishOwnerProof,
  useRenewOwnerProof,
  useProofMissions,
  useRefreshProofVerification,
  useReplaceProofCriteria,
  useSubmitProofMission,
  useUnpublishOwnerProof,
  useUpdateOwnerProofProfile,
} from './use-career';
import {
  getGithubConnectionIssue,
  useCompleteGithubInstallationClaim,
  useGithubRepositories,
  useGithubSetup,
  useStartGithubInstallationClaim,
} from './use-github';
import { VerificationResults } from './VerificationResults';

const STATUS_META: Record<
  CareerDiffStatus,
  { label: string; className: string; icon: typeof ShieldCheck }
> = {
  VERIFIED: {
    label: '검증 완료',
    className: 'bg-success-subtle text-success',
    icon: ShieldCheck,
  },
  SUBMITTED: {
    label: '검토 중',
    className: 'bg-warning-subtle text-warning',
    icon: Clock3,
  },
  MISSING: {
    label: '증거 없음',
    className: 'bg-muted text-muted-foreground',
    icon: CircleDashed,
  },
};

const STATUS_ORDER: CareerDiffStatus[] = ['MISSING', 'SUBMITTED', 'VERIFIED'];

function getCompetencyCountBucket(count: number): '1' | '2-3' | '4+' | null {
  if (count === 1) return '1';
  if (count >= 2 && count <= 3) return '2-3';
  return count >= 4 ? '4+' : null;
}

function getRequirementsLengthBucket(
  length: number,
): '20-499' | '500-1999' | '2000-4999' | '5000-20000' | null {
  if (length >= 20 && length <= 499) return '20-499';
  if (length >= 500 && length <= 1_999) return '500-1999';
  if (length >= 2_000 && length <= 4_999) return '2000-4999';
  if (length >= 5_000 && length <= 20_000) return '5000-20000';
  return null;
}

export type ProofPublicationCapability =
  'FIRST_PUBLISH' | 'REPUBLISH' | 'RECOVER_INVALIDATED' | 'RENEW_IN_SETTINGS' | null;

export function getProofPublicationCapability(
  eligible: boolean,
  publication: OwnerProofProfile['proofs'][number] | undefined,
  now: number,
): ProofPublicationCapability {
  if (!eligible) return null;
  if (!publication) return 'FIRST_PUBLISH';

  const leaseElapsed = new Date(publication.validUntil).getTime() <= now;
  if (leaseElapsed) {
    if (publication.publicationState === 'INVALIDATED') return 'RECOVER_INVALIDATED';
    return publication.publicationState === 'UNPUBLISHED' ? 'RENEW_IN_SETTINGS' : null;
  }
  return publication.publicationState === 'UNPUBLISHED' ||
    publication.publicationState === 'INVALIDATED'
    ? 'REPUBLISH'
    : null;
}

const CRITERION_LABELS: Record<ProofCriterionType, string> = {
  MERGED_PR: 'PR 병합 완료',
  BASE_BRANCH: '기준 브랜치 일치',
  CHANGED_PATH: '변경 경로 포함',
  NAMED_CHECK: '필수 검사 통과',
  HUMAN_CHECK: '리뷰어 확인 항목',
};

function criterionToDraft(criterion: ProofMission['criteria'][number]): ProofCriterionDraft {
  switch (criterion.type) {
    case 'BASE_BRANCH':
      return { id: criterion.id, type: criterion.type, branch: criterion.config.branch ?? '' };
    case 'CHANGED_PATH':
      return { id: criterion.id, type: criterion.type, pathGlob: criterion.config.glob ?? '' };
    case 'NAMED_CHECK':
      return { id: criterion.id, type: criterion.type, checkName: criterion.config.context ?? '' };
    case 'HUMAN_CHECK':
      return { id: criterion.id, type: criterion.type, description: criterion.config.label ?? '' };
    default:
      return { id: criterion.id, type: 'MERGED_PR' };
  }
}

function criterionToInput(criterion: ProofCriterionDraft): ProofCriterionConfig {
  switch (criterion.type) {
    case 'BASE_BRANCH':
      return { type: criterion.type, config: { branch: criterion.branch } };
    case 'CHANGED_PATH':
      return { type: criterion.type, config: { glob: criterion.pathGlob } };
    case 'NAMED_CHECK':
      return { type: criterion.type, config: { context: criterion.checkName } };
    case 'HUMAN_CHECK':
      return { type: criterion.type, config: { label: criterion.description } };
    default:
      return { type: 'MERGED_PR', config: {} };
  }
}

function githubErrorMessage(error: unknown): string {
  switch (getGithubConnectionIssue(error)) {
    case 'DISCONNECTED':
      return 'GitHub 연결이 만료되었습니다. 개인 계정 App을 다시 연결해주세요.';
    case 'REVOKED':
      return 'GitHub App 설치가 중지되었거나 해제되었습니다. 연결을 다시 활성화해주세요.';
    case 'PERMISSION_REQUIRED':
      return '이 저장소를 읽을 권한이 없습니다. GitHub App의 저장소 허용 범위를 확인해주세요.';
    case 'NOT_FOUND':
      return '선택한 저장소에서 해당 PR을 찾지 못했습니다. PR 번호를 확인해주세요.';
    case 'RATE_LIMITED':
      return 'GitHub 요청 한도에 도달했습니다. 잠시 후 직접 다시 시도해주세요.';
    default:
      return 'GitHub에서 현재 상태를 확인하지 못했습니다. 잠시 후 직접 다시 시도해주세요.';
  }
}

function verificationErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as { code: string }).code.startsWith('GITHUB_')
  ) {
    return githubErrorMessage(error);
  }
  return error instanceof Error ? error.message : '검증을 완료하지 못했습니다.';
}

function CareerWorkspaceContent({ proofProfileEnabled }: { proofProfileEnabled: boolean }) {
  const [renderedAt, setRenderedAt] = useState<number | null>(null);
  const [githubCallbackStatus, setGithubCallbackStatus] = useState<
    { state: 'pending' | 'success' | 'error'; message: string } | undefined
  >();
  const githubCallbackHandled = useRef(false);
  const competenciesQuery = useCareerCompetencies();
  const targetsQuery = useCareerTargets();
  const evidenceQuery = useCareerEvidence();
  const createTarget = useCreateCareerTarget();
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showNewTarget, setShowNewTarget] = useState(false);
  const [selectedCompetencySlug, setSelectedCompetencySlug] = useState<string | null>(null);
  const [showCriteriaEditor, setShowCriteriaEditor] = useState(false);
  const [showGithubPicker, setShowGithubPicker] = useState(false);
  const [repositoryId, setRepositoryId] = useState('');
  const [pullNumber, setPullNumber] = useState('');
  const activeTargetId = selectedTargetId ?? targetsQuery.data?.[0]?.id ?? null;
  const diffQuery = useCareerDiff(activeTargetId);
  const createEvidence = useCreateCareerEvidence(activeTargetId);
  const missionsQuery = useProofMissions(activeTargetId);
  const createMission = useCreateProofMission();
  const replaceCriteria = useReplaceProofCriteria();
  const bindMission = useBindProofMission();
  const refreshVerification = useRefreshProofVerification();
  const submitMission = useSubmitProofMission();
  const selectedMission =
    missionsQuery.data?.find((mission) => mission.competencySlug === selectedCompetencySlug) ??
    null;
  const githubSetupQuery = useGithubSetup(Boolean(selectedMission));
  const githubRepositoriesQuery = useGithubRepositories(
    Boolean(selectedMission && githubSetupQuery.data?.installation?.status === 'ACTIVE'),
  );
  const startGithubClaim = useStartGithubInstallationClaim();
  const completeGithubClaim = useCompleteGithubInstallationClaim();

  useEffect(() => {
    const timer = window.setTimeout(() => setRenderedAt(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (githubCallbackHandled.current) return;

    const callbackUrl = new URL(window.location.href);
    const hasState = callbackUrl.searchParams.has('state');
    const hasInstallationId = callbackUrl.searchParams.has('installation_id');
    if (!hasState && !hasInstallationId) return;

    githubCallbackHandled.current = true;
    const cleanCallbackOperands = () => {
      callbackUrl.searchParams.delete('state');
      callbackUrl.searchParams.delete('installation_id');
      window.history.replaceState(
        window.history.state,
        '',
        `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`,
      );
    };
    const state = callbackUrl.searchParams.get('state') ?? '';
    const installationId = callbackUrl.searchParams.get('installation_id') ?? '';
    if (!hasState || !hasInstallationId || state.length === 0 || !/^[0-9]+$/.test(installationId)) {
      cleanCallbackOperands();
      queueMicrotask(() => {
        setGithubCallbackStatus({
          state: 'error',
          message: 'GitHub App 연결 응답이 올바르지 않습니다. 다시 연결해주세요.',
        });
      });
      return;
    }

    queueMicrotask(() => {
      setGithubCallbackStatus({
        state: 'pending',
        message: 'GitHub App 연결을 완료하는 중입니다.',
      });
    });
    void completeGithubClaim
      .mutateAsync({ state, installationId })
      .then((result) => {
        window.history.replaceState(window.history.state, '', result.returnPath);
        setGithubCallbackStatus({
          state: 'success',
          message: `GitHub App 연결이 완료되었습니다. 저장소 ${result.repositoryCount}개를 확인했습니다.`,
        });
      })
      .catch((error: unknown) => {
        cleanCallbackOperands();
        setGithubCallbackStatus({
          state: 'error',
          message: githubErrorMessage(error),
        });
      });
  }, [completeGithubClaim]);

  const targetCompetencies = useMemo(() => {
    const allowed = new Set(diffQuery.data?.target.competencySlugs ?? []);
    return (competenciesQuery.data ?? []).filter((competency) => allowed.has(competency.slug));
  }, [competenciesQuery.data, diffQuery.data]);

  const sortedCompetencies = useMemo(
    () =>
      [...(diffQuery.data?.competencies ?? [])].sort(
        (left, right) => STATUS_ORDER.indexOf(left.status) - STATUS_ORDER.indexOf(right.status),
      ),
    [diffQuery.data],
  );

  const handleTargetCreate = async (input: Parameters<typeof createTarget.mutateAsync>[0]) => {
    const target = await createTarget.mutateAsync(input);
    const competencyCountBucket = getCompetencyCountBucket(target.competencySlugs.length);
    const requirementsLengthBucket = getRequirementsLengthBucket(input.requirements.trim().length);
    if (competencyCountBucket && requirementsLengthBucket) {
      capture('career_target_created', {
        competency_count_bucket: competencyCountBucket,
        has_posting_url: Boolean(input.postingUrl?.trim()),
        requirements_length_bucket: requirementsLengthBucket,
      });
    }
    setSelectedTargetId(target.id);
    setSelectedCompetencySlug(null);
    setShowCriteriaEditor(false);
    setShowGithubPicker(false);
    setShowNewTarget(false);
  };

  const handleMissionOpen = async (competencySlug: string, competencyLabel: string) => {
    setSelectedCompetencySlug(competencySlug);
    setShowCriteriaEditor(false);
    setShowGithubPicker(false);
    if (
      !activeTargetId ||
      missionsQuery.data?.some((item) => item.competencySlug === competencySlug)
    ) {
      return;
    }
    await createMission.mutateAsync({
      targetId: activeTargetId,
      competencySlug,
      title: `${competencyLabel} 역량 증명`,
    });
  };

  const handleGithubConnect = async () => {
    const claim = await startGithubClaim.mutateAsync('/career');
    window.location.assign(claim.setupUrl);
  };

  const hasInitialError = competenciesQuery.isError || targetsQuery.isError;
  const isInitialLoading =
    !hasInitialError &&
    (competenciesQuery.isLoading ||
      targetsQuery.isLoading ||
      competenciesQuery.data === undefined ||
      targetsQuery.data === undefined);
  const proofProfileSettings = proofProfileEnabled ? <ProofProfileSettingsSection /> : null;

  return (
    <AppShell activeTab="career">
      {githubCallbackStatus ? (
        <div
          className={cn(
            'mb-5 rounded-2xl border p-4 text-sm font-bold',
            githubCallbackStatus.state === 'error'
              ? 'border-error/30 bg-error-subtle text-error'
              : 'border-border bg-card',
          )}
          role={githubCallbackStatus.state === 'error' ? 'alert' : 'status'}
        >
          {githubCallbackStatus.message}
        </div>
      ) : null}
      {isInitialLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground text-sm">Career Diff를 불러오는 중입니다.</p>
        </div>
      ) : hasInitialError ? (
        <div className="border-error/30 bg-error-subtle rounded-2xl border p-6">
          <h1 className="text-error text-lg font-extrabold">Career Diff를 불러오지 못했습니다.</h1>
          <Button className="mt-4" onClick={() => void targetsQuery.refetch()} variant="outline">
            다시 시도
          </Button>
        </div>
      ) : !targetsQuery.data?.length ? (
        <div className="space-y-6">
          <CareerTargetForm
            competencies={competenciesQuery.data ?? []}
            isSubmitting={createTarget.isPending}
            onSubmit={handleTargetCreate}
          />
          {proofProfileSettings}
        </div>
      ) : (
        <div className="w-full">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-primary text-xs font-extrabold">CAREER DIFF</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                목표 직무까지 부족한 증거
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
                자기평가 점수가 아니라 검토된 결과물만 준비도에 반영합니다.
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:w-72">
              <label>
                <span className="sr-only">목표 직무 선택</span>
                <select
                  aria-label="목표 직무 선택"
                  value={activeTargetId ?? ''}
                  onChange={(event) => {
                    setSelectedTargetId(event.target.value);
                    setSelectedCompetencySlug(null);
                    setShowCriteriaEditor(false);
                    setShowGithubPicker(false);
                    setShowNewTarget(false);
                  }}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 h-11 w-full rounded-xl border px-3.5 text-sm font-bold outline-none focus-visible:ring-3"
                >
                  {targetsQuery.data.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.company} · {target.role}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewTarget((current) => !current)}
              >
                {showNewTarget ? '현재 목표로 돌아가기' : '새 목표 추가'}
              </Button>
              <Link
                href="/career/review"
                className="text-primary focus-visible:ring-ring inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-bold hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                검토 대기열
              </Link>
            </div>
          </header>

          {showNewTarget ? (
            <div className="mt-7">
              <CareerTargetForm
                competencies={competenciesQuery.data ?? []}
                isSubmitting={createTarget.isPending}
                onSubmit={handleTargetCreate}
              />
            </div>
          ) : diffQuery.isLoading ? (
            <div className="mt-8 flex min-h-80 items-center justify-center">
              <p className="text-muted-foreground text-sm">증거 차이를 계산하는 중입니다.</p>
            </div>
          ) : diffQuery.isError || !diffQuery.data ? (
            <div className="border-error/30 bg-error-subtle mt-8 rounded-2xl border p-6">
              <p className="text-error font-bold">증거 차이를 계산하지 못했습니다.</p>
              <Button className="mt-4" onClick={() => void diffQuery.refetch()} variant="outline">
                다시 시도
              </Button>
            </div>
          ) : (
            <>
              <section className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
                <article className="bg-primary text-primary-foreground overflow-hidden rounded-3xl p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-primary-foreground/75 text-xs font-bold">
                        {diffQuery.data.target.company}
                      </p>
                      <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                        {diffQuery.data.target.role}
                      </h2>
                      {diffQuery.data.target.postingUrl ? (
                        <a
                          className="text-primary-foreground/80 mt-4 inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
                          href={diffQuery.data.target.postingUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          채용공고 원문
                          <ExternalLink aria-hidden="true" className="size-3.5" />
                        </a>
                      ) : null}
                    </div>
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                      <Target aria-hidden="true" className="size-6" />
                    </span>
                  </div>
                  <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-primary-foreground/70 text-xs font-bold">검증된 준비도</p>
                      <p className="mt-1 text-4xl font-black">
                        {diffQuery.data.summary.verifiedPercentage}%
                      </p>
                    </div>
                    <p className="text-primary-foreground/80 text-right text-xs leading-5">
                      {diffQuery.data.summary.verifiedCount} /{' '}
                      {diffQuery.data.summary.requiredCount}개 역량 검증
                    </p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full w-full origin-left rounded-full bg-white transition-transform"
                      style={{
                        transform: `scaleX(${diffQuery.data.summary.verifiedPercentage / 100})`,
                      }}
                    />
                  </div>
                </article>

                <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                  {[
                    {
                      label: '검증 완료',
                      value: diffQuery.data.summary.verifiedCount,
                      className: 'text-success',
                    },
                    {
                      label: '검토 중',
                      value: diffQuery.data.summary.submittedCount,
                      className: 'text-warning',
                    },
                    {
                      label: '증거 없음',
                      value: diffQuery.data.summary.missingCount,
                      className: 'text-muted-foreground',
                    },
                  ].map((item) => (
                    <article
                      key={item.label}
                      className="border-border bg-card rounded-2xl border p-4 lg:flex lg:items-center lg:justify-between"
                    >
                      <p className="text-muted-foreground text-xs font-bold">{item.label}</p>
                      <p className={cn('mt-2 text-2xl font-black lg:mt-0', item.className)}>
                        {item.value}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              {selectedCompetencySlug ? (
                <section className="mt-8 space-y-5" aria-label="선택한 증명 미션">
                  {missionsQuery.isLoading || (createMission.isPending && !selectedMission) ? (
                    <div className="border-border bg-card flex min-h-40 items-center justify-center rounded-3xl border">
                      <p className="text-muted-foreground text-sm" role="status">
                        증명 미션을 준비하는 중입니다.
                      </p>
                    </div>
                  ) : missionsQuery.isError || createMission.isError || !selectedMission ? (
                    <div
                      className="border-error/30 bg-error-subtle rounded-3xl border p-5"
                      role="alert"
                    >
                      <p className="text-error text-sm font-bold">
                        증명 미션을 불러오지 못했습니다.
                      </p>
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const competency = diffQuery.data?.competencies.find(
                            (item) => item.slug === selectedCompetencySlug,
                          );
                          if (createMission.isError && competency) {
                            void handleMissionOpen(competency.slug, competency.label);
                          } else {
                            void missionsQuery.refetch();
                          }
                        }}
                      >
                        다시 시도
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ProofMissionPanel
                        mission={{
                          id: selectedMission.id,
                          objective: selectedMission.title,
                          state: selectedMission.state,
                          criteriaCount: selectedMission.criteria.length,
                          isGithubBound: Boolean(selectedMission.binding),
                          currentRunStatus:
                            selectedMission.state === 'BOUND' ||
                            selectedMission.state === 'RETURNED'
                              ? (selectedMission.currentVerificationRun?.status ?? null)
                              : null,
                          isStale: selectedMission.currentVerificationRun?.stale ?? false,
                        }}
                        competency={{
                          slug: selectedMission.competencySlug,
                          label: selectedMission.competencyLabel,
                        }}
                        onEditCriteria={() => {
                          if (
                            selectedMission.state === 'DRAFT' ||
                            selectedMission.state === 'BOUND' ||
                            selectedMission.state === 'RETURNED'
                          ) {
                            setShowCriteriaEditor((current) => !current);
                          }
                        }}
                        onConnectGithub={() => setShowGithubPicker(true)}
                        onBind={() => {
                          if (selectedMission.binding) {
                            setRepositoryId(selectedMission.binding.githubRepositoryId);
                            setPullNumber(String(selectedMission.binding.pullNumber));
                          }
                          setShowGithubPicker(true);
                        }}
                        onRefresh={() => {
                          if (selectedMission.binding) {
                            void refreshVerification.mutateAsync(selectedMission.id);
                          } else {
                            setShowGithubPicker(true);
                          }
                        }}
                        onSubmit={() => void submitMission.mutateAsync(selectedMission.id)}
                        isRefreshing={refreshVerification.isPending}
                        isSubmitting={submitMission.isPending}
                      />

                      {proofProfileEnabled ? (
                        <ProofPublicationControls
                          mission={selectedMission}
                          renderedAt={renderedAt}
                        />
                      ) : null}

                      {showCriteriaEditor ? (
                        <ProofCriteriaEditor
                          criteria={selectedMission.criteria.map(criterionToDraft)}
                          disabled={
                            selectedMission.state !== 'DRAFT' &&
                            selectedMission.state !== 'BOUND' &&
                            selectedMission.state !== 'RETURNED'
                          }
                          onSave={async (criteria) => {
                            await replaceCriteria.mutateAsync({
                              missionId: selectedMission.id,
                              criteria: criteria.map(criterionToInput),
                            });
                            setShowCriteriaEditor(false);
                          }}
                          isSaving={replaceCriteria.isPending}
                        />
                      ) : null}

                      {showGithubPicker ? (
                        <GithubProofPicker
                          connection={{
                            status: githubSetupQuery.data?.installation?.status ?? 'DISCONNECTED',
                            accountId: githubSetupQuery.data?.installation?.accountId,
                          }}
                          repositories={(githubRepositoriesQuery.data ?? []).map((repository) => ({
                            id: String(repository.repositoryId),
                            nameWithOwner: repository.fullName,
                            isPrivate: repository.private,
                          }))}
                          selectedRepositoryId={repositoryId}
                          pullNumber={pullNumber}
                          onConnect={() => void handleGithubConnect()}
                          onRepositoryChange={setRepositoryId}
                          onPullNumberChange={setPullNumber}
                          onBind={async () => {
                            const installationId = githubSetupQuery.data?.installation?.id;
                            if (!installationId) throw new Error('GitHub App 연결이 필요합니다.');
                            await bindMission.mutateAsync({
                              missionId: selectedMission.id,
                              installationId,
                              githubRepositoryId: repositoryId,
                              pullNumber: Number(pullNumber),
                            });
                            setShowGithubPicker(false);
                          }}
                          isBinding={bindMission.isPending}
                          isLoading={
                            githubSetupQuery.isLoading || githubRepositoriesQuery.isLoading
                          }
                          error={
                            githubSetupQuery.error
                              ? githubErrorMessage(githubSetupQuery.error)
                              : githubRepositoriesQuery.error
                                ? githubErrorMessage(githubRepositoriesQuery.error)
                                : bindMission.error
                                  ? githubErrorMessage(bindMission.error)
                                  : null
                          }
                          onRetry={() => {
                            void githubSetupQuery.refetch();
                            void githubRepositoriesQuery.refetch();
                          }}
                        />
                      ) : null}

                      <VerificationResults
                        run={
                          selectedMission.currentVerificationRun
                            ? {
                                id: selectedMission.currentVerificationRun.id,
                                status: selectedMission.currentVerificationRun.status,
                                observedAt: selectedMission.currentVerificationRun.observedAt,
                                isStale: selectedMission.currentVerificationRun.stale,
                                results: selectedMission.currentVerificationRun.criteria.map(
                                  (result) => ({
                                    criterionId: result.criterionId,
                                    label: CRITERION_LABELS[result.type],
                                    type: result.type,
                                    status: result.passed
                                      ? 'PASS'
                                      : selectedMission.currentVerificationRun?.status === 'ERROR'
                                        ? 'ERROR'
                                        : 'FAIL',
                                    message: result.detail ?? undefined,
                                  }),
                                ),
                              }
                            : null
                        }
                        missionState={selectedMission.state}
                        onRefresh={() => {
                          if (selectedMission.binding) {
                            void refreshVerification.mutateAsync(selectedMission.id);
                          } else {
                            setShowGithubPicker(true);
                          }
                        }}
                        isRefreshing={refreshVerification.isPending}
                        error={
                          refreshVerification.error
                            ? verificationErrorMessage(refreshVerification.error)
                            : submitMission.error instanceof Error
                              ? submitMission.error.message
                              : null
                        }
                      />
                    </>
                  )}
                </section>
              ) : null}

              <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
                <section aria-labelledby="competency-gap-heading">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-primary text-xs font-extrabold">EVIDENCE GAP</p>
                      <h2 id="competency-gap-heading" className="mt-1 text-xl font-extrabold">
                        필요한 역량 증거
                      </h2>
                    </div>
                    <Link
                      href="/myroadmap"
                      className="text-primary text-sm font-bold hover:underline"
                    >
                      실행 과제 보기
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {sortedCompetencies.map((competency) => {
                      const meta = STATUS_META[competency.status];
                      const StatusIcon = meta.icon;
                      return (
                        <article
                          key={competency.slug}
                          className="border-border bg-card rounded-2xl border p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-extrabold">{competency.label}</p>
                              <p className="text-muted-foreground mt-1 text-sm leading-6">
                                {competency.description}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold',
                                meta.className,
                              )}
                            >
                              <StatusIcon aria-hidden="true" className="size-3.5" />
                              {meta.label}
                            </span>
                          </div>
                          {competency.evidence.length > 0 ? (
                            <ul className="border-border mt-4 space-y-2 border-t pt-4">
                              {competency.evidence.map((item) => (
                                <li key={item.id}>
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                                  >
                                    <FileCheck2 aria-hidden="true" className="size-4" />
                                    {item.title}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <Button
                            className="mt-4 w-full sm:w-auto"
                            size="sm"
                            variant={competency.status === 'MISSING' ? 'solid' : 'outline'}
                            onClick={() =>
                              void handleMissionOpen(competency.slug, competency.label)
                            }
                            disabled={missionsQuery.isLoading || createMission.isPending}
                          >
                            {missionsQuery.data?.some(
                              (mission) => mission.competencySlug === competency.slug,
                            )
                              ? '증명 미션 열기'
                              : '증명 미션 시작'}
                          </Button>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <aside className="space-y-5">
                  <CareerEvidenceForm
                    competencies={targetCompetencies}
                    isSubmitting={createEvidence.isPending}
                    onSubmit={async (input) => {
                      await createEvidence.mutateAsync(input);
                      const competencyCountBucket = getCompetencyCountBucket(
                        input.competencySlugs.length,
                      );
                      if (competencyCountBucket) {
                        capture('career_evidence_submitted', {
                          evidence_kind: input.kind,
                          competency_count_bucket: competencyCountBucket,
                          has_description: Boolean(input.description?.trim()),
                        });
                      }
                    }}
                  />

                  <section className="border-border bg-card rounded-2xl border p-5">
                    <h2 className="text-sm font-extrabold">참고 자료</h2>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      직접 등록한 링크는 참고용이며 Career Diff의 검증 점수에는 반영되지 않습니다.
                    </p>
                    {evidenceQuery.data?.length ? (
                      <ul className="mt-4 space-y-3">
                        {evidenceQuery.data.slice(0, 5).map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-3">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="min-w-0 truncate text-xs font-bold hover:underline"
                            >
                              {item.title}
                            </a>
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2 py-1 text-[11px] font-bold',
                                item.status === 'VERIFIED'
                                  ? 'bg-success-subtle text-success'
                                  : item.status === 'REJECTED'
                                    ? 'bg-error-subtle text-error'
                                    : 'bg-warning-subtle text-warning',
                              )}
                            >
                              {item.status === 'VERIFIED'
                                ? '검토 완료 · 참고'
                                : item.status === 'REJECTED'
                                  ? '보완 필요'
                                  : '제출됨 · 참고'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground mt-3 text-xs leading-5">
                        아직 등록한 참고 자료가 없습니다.
                      </p>
                    )}
                  </section>

                  {proofProfileSettings}
                </aside>
              </div>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function ProofProfileSettingsSection() {
  const ownerProofProfileQuery = useOwnerProofProfile();
  const updateOwnerProofProfile = useUpdateOwnerProofProfile();
  const publishOwnerProof = usePublishOwnerProof();
  const renewOwnerProof = useRenewOwnerProof();
  const unpublishOwnerProof = useUnpublishOwnerProof();
  const ownerProofProfile =
    ownerProofProfileQuery.data === null
      ? {
          state: 'DISABLED' as const,
          publicId: null,
          displayName: '',
          summary: '',
          proofs: [],
        }
      : ownerProofProfileQuery.data;
  const proofMissionIds = useMemo(
    () =>
      new Map(
        (ownerProofProfile?.proofs ?? []).map(
          (proof) => [proof.publicProofId, proof.missionId] as const,
        ),
      ),
    [ownerProofProfile?.proofs],
  );

  if (ownerProofProfileQuery.isLoading) {
    return (
      <section
        aria-label="공개 증명 프로필"
        className="border-border bg-card rounded-2xl border p-6"
      >
        <p role="status" className="text-muted-foreground text-sm">
          공개 증명 프로필을 불러오는 중입니다.
        </p>
      </section>
    );
  }
  if (ownerProofProfileQuery.isError || ownerProofProfile === undefined) {
    return (
      <section
        aria-label="공개 증명 프로필"
        className="border-error/30 bg-error-subtle rounded-2xl border p-6"
      >
        <p className="text-error font-bold">
          {ownerProofProfileQuery.isError
            ? '공개 증명 프로필을 불러오지 못했습니다.'
            : '공개 증명 프로필 상태를 확인하지 못했습니다.'}
        </p>
        <Button
          className="mt-4"
          onClick={() => void ownerProofProfileQuery.refetch()}
          variant="outline"
        >
          프로필 다시 시도
        </Button>
      </section>
    );
  }

  return (
    <ProofProfileSettings
      profile={{
        state: ownerProofProfile.state,
        publicId: ownerProofProfile.publicId,
        displayName: ownerProofProfile.displayName,
        summary: ownerProofProfile.summary,
        proofs: ownerProofProfile.proofs.map((proof) => ({
          publicProofId: proof.publicProofId,
          title: proof.title,
          summary: proof.summary,
          competencyLabel: proof.competencyLabel,
          contributionSummary: null,
          verifiedAt: proof.verifiedAt,
          criteria: proof.criteria,
          publicationState: proof.publicationState,
          validUntil: proof.validUntil,
          isPublished: proof.isPublished,
        })),
      }}
      onSaveProfile={async ({ displayName, summary }) => {
        await updateOwnerProofProfile.mutateAsync({
          state: ownerProofProfile.state,
          displayName,
          summary,
        });
      }}
      onEnableProfile={async () => {
        await updateOwnerProofProfile.mutateAsync({
          state: 'ENABLED',
          displayName: ownerProofProfile.displayName,
          summary: ownerProofProfile.summary || null,
        });
      }}
      onDisableProfile={async () => {
        await updateOwnerProofProfile.mutateAsync({
          state: 'DISABLED',
          displayName: ownerProofProfile.displayName,
          summary: ownerProofProfile.summary || null,
        });
      }}
      onSetProofPublished={async (publicProofId, published) => {
        const missionId = proofMissionIds.get(publicProofId);
        if (!missionId) throw new Error('현재 목표에서 이 증명의 미션을 찾지 못했습니다.');
        if (published) {
          await publishOwnerProof.mutateAsync({ missionId });
        } else {
          await unpublishOwnerProof.mutateAsync(missionId);
        }
      }}
      onRenewProof={async (publicProofId) => {
        const missionId = proofMissionIds.get(publicProofId);
        if (!missionId) throw new Error('현재 목표에서 이 증명의 미션을 찾지 못했습니다.');
        await renewOwnerProof.mutateAsync({ missionId });
      }}
      isSaving={
        updateOwnerProofProfile.isPending &&
        updateOwnerProofProfile.variables?.state === ownerProofProfile.state
      }
      isEnabling={
        updateOwnerProofProfile.isPending && updateOwnerProofProfile.variables?.state === 'ENABLED'
      }
      isDisabling={
        updateOwnerProofProfile.isPending && updateOwnerProofProfile.variables?.state === 'DISABLED'
      }
      updatingProofId={
        [...proofMissionIds.entries()].find(
          ([, missionId]) =>
            (publishOwnerProof.isPending && missionId === publishOwnerProof.variables?.missionId) ||
            (unpublishOwnerProof.isPending && missionId === unpublishOwnerProof.variables),
        )?.[0] ?? null
      }
      renewingProofId={
        [...proofMissionIds.entries()].find(
          ([, missionId]) =>
            renewOwnerProof.isPending && missionId === renewOwnerProof.variables?.missionId,
        )?.[0] ?? null
      }
      error={
        updateOwnerProofProfile.error instanceof Error
          ? updateOwnerProofProfile.error.message
          : publishOwnerProof.error instanceof Error
            ? publishOwnerProof.error.message
            : renewOwnerProof.error instanceof Error
              ? renewOwnerProof.error.message
              : unpublishOwnerProof.error instanceof Error
                ? unpublishOwnerProof.error.message
                : null
      }
    />
  );
}

function ProofPublicationControls({
  mission,
  renderedAt,
}: {
  mission: ProofMission;
  renderedAt: number | null;
}) {
  const ownerProofProfileQuery = useOwnerProofProfile();
  const publishOwnerProof = usePublishOwnerProof();
  const renewOwnerProof = useRenewOwnerProof();
  const ownerProofProfile = ownerProofProfileQuery.data;
  const publication = ownerProofProfile?.proofs.find((proof) => proof.missionId === mission.id);
  const eligible = Boolean(
    ownerProofProfile?.state === 'ENABLED' &&
    mission.state === 'APPROVED' &&
    mission.currentVerificationRun?.status === 'PASS' &&
    mission.currentVerificationRun.stale === false &&
    mission.currentReview?.decision === 'APPROVED' &&
    mission.currentReview.verificationRunId === mission.currentVerificationRun.id,
  );
  const capability =
    renderedAt === null ? null : getProofPublicationCapability(eligible, publication, renderedAt);

  if (capability === 'FIRST_PUBLISH' || capability === 'REPUBLISH') {
    return (
      <div key={mission.id} className="border-primary/30 bg-primary/5 rounded-2xl border p-5">
        <p className="text-sm font-bold">
          {capability === 'FIRST_PUBLISH'
            ? '승인된 증명을 공개 프로필에 추가할 수 있습니다.'
            : '현재 승인이 유효해 이 증명을 다시 공개할 수 있습니다.'}
        </p>
        <Button
          className="mt-3"
          disabled={publishOwnerProof.isPending}
          onClick={() => void publishOwnerProof.mutateAsync({ missionId: mission.id })}
        >
          {publishOwnerProof.isPending
            ? 'Proof Profile에 공개 중'
            : capability === 'FIRST_PUBLISH'
              ? 'Proof Profile에 공개'
              : 'Proof Profile에 다시 공개'}
        </Button>
      </div>
    );
  }
  if (capability === 'RECOVER_INVALIDATED') {
    return (
      <div className="border-warning/30 bg-warning-subtle rounded-2xl border p-5">
        <p className="text-sm font-bold">
          최신 검증과 승인을 확인해 다시 공개할 수 있는 상태로 준비합니다.
        </p>
        <Button
          className="mt-3"
          disabled={renewOwnerProof.isPending}
          onClick={() => void renewOwnerProof.mutateAsync({ missionId: mission.id })}
        >
          {renewOwnerProof.isPending ? '검증 상태 확인 중' : '검증 상태 확인 후 공개 준비'}
        </Button>
      </div>
    );
  }
  if (capability === 'RENEW_IN_SETTINGS') {
    return (
      <div className="border-warning/30 bg-warning-subtle rounded-2xl border p-5">
        <p className="text-sm font-bold">
          게시 기한이 지났습니다. Proof Profile 공개 설정에서 기한을 갱신한 뒤 공개해주세요.
        </p>
      </div>
    );
  }
  return null;
}

export function CareerWorkspace() {
  const proofProfileEnabled = useFeatureFlag('PROOF_PROFILE_ENABLED');

  return <CareerWorkspaceContent proofProfileEnabled={proofProfileEnabled} />;
}
