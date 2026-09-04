'use client';

import { useCallback, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  ApiResponseError,
  cancelWorkflowOperation,
  confirmCandidateProfileSnapshot,
  confirmCareerDiffSnapshot,
  createCareerDiffSnapshot,
  createProjectRunOperation,
  FIXTURE_JOB_POSTING_URL,
  getCandidateProfileSnapshot,
  getCareerTargetVersion,
  getEligibleGithubRepositories,
  getProjectProposalSet,
  importCareerTarget,
  REPOSITORY_MODE_ORDER,
  startGithubProfileSnapshot,
  startProjectProposalOperation,
  type CareerSnapshotRecord,
  type EligibleGithubRepositoryDto,
  type ProjectProposalRecord,
  type RepositoryBindingDto,
  type WorkflowOperationView,
} from '@jagalchi/api-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

import { useWorkflowOperationPoller } from '../hooks/use-workflow-operation';
import {
  buildDiffConfirmPayload,
  buildProfileConfirmPayload,
  type DiffReviewDraft,
  type ProfileReviewDraft,
} from '../lib/confirm-payload';
import { createIdempotencyKey } from '../lib/idempotency';
import {
  isManualCaptureSuggested,
  mapApiGateError,
  mapWorkflowOperationFailure,
  type OperationFailureView,
} from '../lib/operation-errors';
import { buildProposalComparisons, type ProposalComparisonView } from '../lib/proposal-presenter';
import {
  bindingForMode,
  isRepositoryBindingComplete,
  sortRepositoryModes,
} from '../lib/repository-modes';
import {
  parseCitations,
  parseDiffGaps,
  parseProfileFindings,
  parseProfileRepositories,
  parseTargetHeader,
} from '../lib/snapshot-payload';
import { entryTransport } from '../lib/transport';

import { DiffReviewSection } from './diff-review-section';
import { OperationStatusPanel } from './operation-status-panel';
import { ProfileReviewSection } from './profile-review-section';
import { ProposalComparisonGrid } from './proposal-comparison-grid';
import { RepositoryBindSection } from './repository-bind-section';

type WizardStep =
  | 'intake'
  | 'target-import'
  | 'profile-import'
  | 'profile-review'
  | 'diff-create'
  | 'diff-review'
  | 'proposals-generate'
  | 'proposals-review'
  | 'repository-bind'
  | 'plan-confirm'
  | 'run-create';

const SUPPORTED_SOURCES = [
  '공개 채용 URL (fixture.invalid 포함 로컬 E2E)',
  '수동 캡처 (자동 수집 실패 시)',
];

const DEFAULT_CONSTRAINTS = {
  availableHours: 40,
  preferredStack: [] as string[],
  allowedRepositoryModes: [...REPOSITORY_MODE_ORDER],
};

const EMPTY_PROFILE_DRAFT: ProfileReviewDraft = {
  acceptedRepositoryIds: [],
  competencyActions: {},
  competencyNotes: {},
};

const EMPTY_DIFF_DRAFT: DiffReviewDraft = {
  gapStatuses: {},
  gapNotes: {},
};

function payloadOf<T extends Record<string, unknown>>(record: CareerSnapshotRecord): T {
  return (record.payload ?? {}) as T;
}

export function TargetEntryWizard() {
  const router = useRouter();
  const projectRunsEnabled = useFeatureFlag('PROJECT_RUNS_ENABLED');
  const evidenceEnabled = useFeatureFlag('EVIDENCE_EXECUTION_ENABLED');
  const { pollUntilTerminal, stop } = useWorkflowOperationPoller();

  const [step, setStep] = useState<WizardStep>('intake');
  const [jobUrl, setJobUrl] = useState(FIXTURE_JOB_POSTING_URL);
  const [manualText, setManualText] = useState('');
  const [showManualCapture, setShowManualCapture] = useState(false);

  const [activeOperation, setActiveOperation] = useState<WorkflowOperationView | null>(null);
  const [failure, setFailure] = useState<OperationFailureView | null>(null);
  const [gateBlocked, setGateBlocked] = useState<{
    title: string;
    message: string;
    code?: string;
  } | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [careerTargetId, setCareerTargetId] = useState<string | null>(null);
  const [targetVersion, setTargetVersion] = useState<CareerSnapshotRecord | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<CareerSnapshotRecord | null>(null);
  const [diffSnapshot, setDiffSnapshot] = useState<CareerSnapshotRecord | null>(null);
  const [proposals, setProposals] = useState<ProjectProposalRecord[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [repositoryBinding, setRepositoryBinding] = useState<RepositoryBindingDto | null>(null);
  const [githubRepositories, setGithubRepositories] = useState<EligibleGithubRepositoryDto[]>([]);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string>('');
  const [profileReviewDraft, setProfileReviewDraft] =
    useState<ProfileReviewDraft>(EMPTY_PROFILE_DRAFT);
  const [diffReviewDraft, setDiffReviewDraft] = useState<DiffReviewDraft>(EMPTY_DIFF_DRAFT);

  const targetPayload = useMemo(
    () => (targetVersion ? payloadOf<Record<string, unknown>>(targetVersion) : {}),
    [targetVersion],
  );
  const profilePayload = useMemo(
    () => (profileSnapshot ? payloadOf<Record<string, unknown>>(profileSnapshot) : {}),
    [profileSnapshot],
  );
  const diffPayload = useMemo(
    () => (diffSnapshot ? payloadOf<Record<string, unknown>>(diffSnapshot) : {}),
    [diffSnapshot],
  );

  const citations = useMemo(() => parseCitations(targetPayload), [targetPayload]);
  const profileRepositories = useMemo(
    () => parseProfileRepositories(profilePayload),
    [profilePayload],
  );
  const profileFindings = useMemo(() => parseProfileFindings(profilePayload), [profilePayload]);
  const diffGaps = useMemo(() => parseDiffGaps(diffPayload), [diffPayload]);
  const targetHeader = useMemo(() => parseTargetHeader(targetPayload), [targetPayload]);

  const proposalViews = useMemo(() => {
    try {
      return buildProposalComparisons(proposals, citations, diffGaps);
    } catch {
      return [] as ProposalComparisonView[];
    }
  }, [proposals, citations, diffGaps]);

  const selectedProposal = proposalViews.find((item) => item.id === selectedProposalId) ?? null;
  const allowedRepositoryModes = sortRepositoryModes(DEFAULT_CONSTRAINTS.allowedRepositoryModes);

  const resetFailure = () => {
    setFailure(null);
    setCancelled(false);
  };

  const handleGateError = useCallback((error: unknown) => {
    const mapped = mapApiGateError(error);
    if (mapped) {
      setGateBlocked({ title: mapped.title, message: mapped.message, code: mapped.code });
      return true;
    }
    if (error instanceof ApiResponseError) {
      setFailure({
        title: '요청이 거절됐습니다',
        message: error.message,
        code: error.code,
        retryable: error.status >= 500,
      });
      return true;
    }
    return false;
  }, []);

  const runOperation = useCallback(
    async (
      start: () => Promise<WorkflowOperationView>,
      onSuccess: (operation: WorkflowOperationView) => Promise<void>,
      nextStep: WizardStep,
    ) => {
      resetFailure();
      setStep(nextStep);
      try {
        const started = await start();
        setActiveOperation(started);
        const finished = await pollUntilTerminal(started.id, setActiveOperation);
        setActiveOperation(finished);
        if (finished.state === 'CANCELLED') {
          setCancelled(true);
          return;
        }
        if (finished.state === 'FAILED') {
          const mapped = mapWorkflowOperationFailure(finished.error);
          setFailure(mapped);
          if (isManualCaptureSuggested(mapped.code)) {
            setShowManualCapture(true);
          }
          return;
        }
        await onSuccess(finished);
      } catch (error) {
        if ((error as Error).message === 'WORKFLOW_POLL_ABORTED') {
          setCancelled(true);
          return;
        }
        if (!handleGateError(error)) {
          setFailure({
            title: '요청 처리 중 오류',
            message: error instanceof Error ? error.message : '알 수 없는 오류',
            retryable: true,
          });
        }
      }
    },
    [handleGateError, pollUntilTerminal],
  );

  const cancelActiveOperation = useCallback(async () => {
    if (!activeOperation) {
      stop();
      setCancelled(true);
      return;
    }
    try {
      const cancelledOperation = await cancelWorkflowOperation(entryTransport, activeOperation.id, {
        idempotencyKey: createIdempotencyKey('cancel'),
        ifMatch: String(activeOperation.version),
      });
      setActiveOperation(cancelledOperation);
      setCancelled(true);
      stop();
    } catch (error) {
      handleGateError(error);
    }
  }, [activeOperation, handleGateError, stop]);

  const beginProfileImport = useCallback(async () => {
    await runOperation(
      () =>
        startGithubProfileSnapshot(
          entryTransport,
          { repositoryIds: [] },
          { idempotencyKey: createIdempotencyKey('profile') },
        ),
      async (operation) => {
        const snapshotId = operation.result?.resourceId;
        if (!snapshotId) throw new Error('PROFILE_SNAPSHOT_MISSING');
        const snapshot = await getCandidateProfileSnapshot(entryTransport, snapshotId);
        setProfileSnapshot(snapshot);
        const repositories = parseProfileRepositories(
          (snapshot.payload ?? {}) as Record<string, unknown>,
        );
        setProfileReviewDraft({
          ...EMPTY_PROFILE_DRAFT,
          acceptedRepositoryIds: repositories.map((repo) => repo.id),
        });
        setStep('profile-review');
      },
      'profile-import',
    );
  }, [runOperation]);

  const buildTargetImport = useCallback((): import('@jagalchi/api-client').TargetImportDto => {
    if (showManualCapture && manualText.trim().length > 0) {
      return {
        input: {
          kind: 'MANUAL_CAPTURE',
          originalUrl: jobUrl.trim() || undefined,
          sourceText: manualText.trim(),
        },
      };
    }
    return {
      input: {
        kind: 'FETCHED_URL',
        url: jobUrl.trim(),
      },
    };
  }, [jobUrl, manualText, showManualCapture]);

  const beginTargetImport = useCallback(async () => {
    await runOperation(
      () =>
        importCareerTarget(entryTransport, buildTargetImport(), {
          idempotencyKey: createIdempotencyKey('target'),
        }),
      async (operation) => {
        const versionId = operation.result?.resourceId;
        if (!versionId) throw new Error('TARGET_VERSION_MISSING');
        const version = await getCareerTargetVersion(entryTransport, versionId);
        setTargetVersion(version);
        const targetId = version.careerTargetId ?? version.id;
        setCareerTargetId(targetId);
        await beginProfileImport();
      },
      'target-import',
    );
  }, [beginProfileImport, buildTargetImport, runOperation]);

  const beginIntake = useCallback(async () => {
    setStep('target-import');
    await beginTargetImport();
  }, [beginTargetImport]);

  const confirmProfileReview = useCallback(async () => {
    if (!profileSnapshot) return;
    setConfirmBusy(true);
    resetFailure();
    try {
      const confirmed = await confirmCandidateProfileSnapshot(
        entryTransport,
        profileSnapshot.id,
        buildProfileConfirmPayload(profileFindings, profileReviewDraft),
        { idempotencyKey: createIdempotencyKey('profile-confirm') },
      );
      setProfileSnapshot(confirmed);
      if (!careerTargetId || !targetVersion) throw new Error('TARGET_CONTEXT_MISSING');
      setStep('diff-create');
      const diff = await createCareerDiffSnapshot(
        entryTransport,
        careerTargetId,
        {
          careerTargetVersionId: targetVersion.id,
          candidateProfileSnapshotId: confirmed.id,
        },
        { idempotencyKey: createIdempotencyKey('diff') },
      );
      setDiffSnapshot(diff);
      setDiffReviewDraft(EMPTY_DIFF_DRAFT);
      setStep('diff-review');
    } catch (error) {
      if (!handleGateError(error)) {
        setFailure({
          title: '프로필 확인 실패',
          message: error instanceof Error ? error.message : '알 수 없는 오류',
          retryable: true,
        });
      }
    } finally {
      setConfirmBusy(false);
    }
  }, [
    careerTargetId,
    handleGateError,
    profileFindings,
    profileReviewDraft,
    profileSnapshot,
    targetVersion,
  ]);

  const confirmDiffReview = useCallback(async () => {
    if (!diffSnapshot || !careerTargetId) return;
    setConfirmBusy(true);
    resetFailure();
    try {
      const confirmed = await confirmCareerDiffSnapshot(
        entryTransport,
        diffSnapshot.id,
        buildDiffConfirmPayload(diffGaps, diffReviewDraft),
        { idempotencyKey: createIdempotencyKey('diff-confirm') },
      );
      setDiffSnapshot(confirmed);
      await runOperation(
        () =>
          startProjectProposalOperation(
            entryTransport,
            careerTargetId,
            {
              careerDiffSnapshotId: confirmed.id,
              constraints: DEFAULT_CONSTRAINTS,
            },
            { idempotencyKey: createIdempotencyKey('proposals') },
          ),
        async (operation) => {
          const setId = operation.result?.resourceId;
          if (!setId) throw new Error('PROPOSAL_SET_MISSING');
          const set = await getProjectProposalSet(entryTransport, setId);
          setProposals(set.proposals);
          setSelectedProposalId(set.proposals[0]?.id ?? null);
          setStep('proposals-review');
        },
        'proposals-generate',
      );
    } catch (error) {
      if (!handleGateError(error)) {
        setFailure({
          title: 'Career Diff 확인 실패',
          message: error instanceof Error ? error.message : '알 수 없는 오류',
          retryable: true,
        });
      }
    } finally {
      setConfirmBusy(false);
    }
  }, [careerTargetId, diffGaps, diffReviewDraft, diffSnapshot, handleGateError, runOperation]);

  const enterRepositoryBind = useCallback(async () => {
    if (!selectedProposal) return;
    resetFailure();
    const preferred =
      allowedRepositoryModes.find((mode) => mode === selectedProposal.repositoryMode) ??
      allowedRepositoryModes[0] ??
      'EXISTING_OWNED';
    setRepositoryBinding(bindingForMode(preferred));
    setSelectedRepositoryId('');
    if (preferred === 'EXISTING_OWNED') {
      try {
        const repos = await getEligibleGithubRepositories(entryTransport);
        setGithubRepositories(repos);
      } catch (error) {
        handleGateError(error);
      }
    }
    setStep('repository-bind');
  }, [allowedRepositoryModes, handleGateError, selectedProposal]);

  const enterPlanConfirm = useCallback(() => {
    if (!selectedProposal || !repositoryBinding) return;
    if (!isRepositoryBindingComplete(repositoryBinding.mode, repositoryBinding)) return;
    setStep('plan-confirm');
  }, [repositoryBinding, selectedProposal]);

  const createProjectRun = useCallback(async () => {
    if (!selectedProposalId || !profileSnapshot || !diffSnapshot || !repositoryBinding) return;
    await runOperation(
      () =>
        createProjectRunOperation(
          entryTransport,
          {
            projectProposalId: selectedProposalId,
            candidateProfileSnapshotId: profileSnapshot.id,
            careerDiffSnapshotId: diffSnapshot.id,
            repository: repositoryBinding,
            constraints: { availableHours: DEFAULT_CONSTRAINTS.availableHours },
          },
          { idempotencyKey: createIdempotencyKey('run') },
        ),
      async (operation) => {
        const runId = operation.result?.resourceId;
        if (!runId) throw new Error('PROJECT_RUN_MISSING');
        router.push(`/projects/${runId}`);
      },
      'run-create',
    );
  }, [diffSnapshot, profileSnapshot, repositoryBinding, router, runOperation, selectedProposalId]);

  const retryCurrentOperation = useCallback(() => {
    resetFailure();
    if (step === 'target-import' || step === 'intake') {
      void beginIntake();
      return;
    }
    if (step === 'profile-import') {
      void beginProfileImport();
      return;
    }
    if (step === 'proposals-generate') {
      void confirmDiffReview();
      return;
    }
    if (step === 'run-create') {
      void createProjectRun();
    }
  }, [beginIntake, beginProfileImport, confirmDiffReview, createProjectRun, step]);

  const operationBusy =
    step === 'target-import' ||
    step === 'profile-import' ||
    step === 'proposals-generate' ||
    step === 'run-create';

  const operationTitle: Record<WizardStep, string> = {
    intake: '준비 중',
    'target-import': '공고 가져오는 중',
    'profile-import': 'GitHub 증거 수집 중',
    'profile-review': '프로필 검토',
    'diff-create': 'Career Diff 생성 중',
    'diff-review': 'Career Diff 검토',
    'proposals-generate': '프로젝트 제안 생성 중',
    'proposals-review': '제안 비교',
    'repository-bind': '저장소 연결',
    'plan-confirm': '범위 확인',
    'run-create': '프로젝트 실행 생성 중',
  };

  if (!projectRunsEnabled || !evidenceEnabled) {
    return (
      <div className="border-border rounded-2xl border p-6">
        <h1 className="text-xl font-bold">프로젝트 실행을 사용할 수 없습니다</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          이 환경에서는 프로젝트 실행 또는 증거 실행 기능이 비활성화되어 있습니다.
        </p>
      </div>
    );
  }

  if (gateBlocked) {
    return (
      <div className="border-border rounded-2xl border p-6">
        <h1 className="text-xl font-bold">{gateBlocked.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{gateBlocked.message}</p>
        {gateBlocked.code ? (
          <p className="text-muted-foreground mt-1 text-xs">코드: {gateBlocked.code}</p>
        ) : null}
        <Button asChild className="mt-4" variant="outline">
          <Link href="/create">돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-muted-foreground text-sm">Phase 2 · Target Entry</p>
        <h1 className="text-2xl font-bold">목표 공고 → 프로젝트 실행</h1>
        <p className="text-muted-foreground text-sm">
          공고 수집, GitHub 증거 확인, Career Diff, 제안 비교 후 프로젝트 실행(Map)까지 이어집니다.
        </p>
      </header>

      {operationBusy ? (
        <OperationStatusPanel
          title={operationTitle[step]}
          message="WorkflowOperation을 폴링합니다. Retry-After를 준수합니다."
          busy={!failure && !cancelled}
          failure={failure}
          cancelled={cancelled}
          onRetry={retryCurrentOperation}
          onCancel={() => void cancelActiveOperation()}
        />
      ) : null}

      {step === 'intake' ? (
        <section className="space-y-4">
          <div className="border-border rounded-xl border p-4">
            <h2 className="font-semibold">지원 소스</h2>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-sm">
              {SUPPORTED_SOURCES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">채용 공고 URL</span>
            <Input value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} />
          </label>
          {showManualCapture ? (
            <label className="block space-y-2">
              <span className="text-sm font-semibold">수동 캡처 본문</span>
              <Textarea
                rows={6}
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                placeholder="자동 수집이 실패한 경우 공고 본문을 붙여넣어 주세요."
              />
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void beginIntake()}>공고 가져오기</Button>
            {isManualCaptureSuggested(failure?.code) || showManualCapture ? (
              <Button variant="outline" onClick={() => setShowManualCapture(true)}>
                수동 캡처 입력
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 'profile-review' && !confirmBusy ? (
        <ProfileReviewSection
          repositories={profileRepositories}
          findings={profileFindings}
          draft={profileReviewDraft}
          onChange={setProfileReviewDraft}
          onConfirm={() => void confirmProfileReview()}
        />
      ) : null}

      {step === 'diff-create' || (step === 'diff-review' && confirmBusy) ? (
        <OperationStatusPanel
          title={confirmBusy ? 'Career Diff 확인 중' : 'Career Diff 생성 중'}
          busy
        />
      ) : null}

      {step === 'diff-review' && !confirmBusy ? (
        <DiffReviewSection
          gaps={diffGaps}
          draft={diffReviewDraft}
          onChange={setDiffReviewDraft}
          onConfirm={() => void confirmDiffReview()}
        />
      ) : null}

      {step === 'proposals-review' && proposalViews.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">프로젝트 제안 비교</h2>
          <p className="text-muted-foreground text-sm">
            세 가지 제안을 동일한 기준으로 비교한 뒤 하나를 선택하세요.
          </p>
          <ProposalComparisonGrid
            proposals={proposalViews}
            selectedId={selectedProposalId}
            onSelect={setSelectedProposalId}
          />
          <Button disabled={!selectedProposalId} onClick={() => void enterRepositoryBind()}>
            저장소 연결로 계속
          </Button>
        </section>
      ) : null}

      {step === 'proposals-review' && proposalViews.length === 0 && !operationBusy ? (
        <div className="border-border rounded-xl border p-4">
          <p className="font-semibold">제안을 표시할 수 없습니다</p>
          <p className="text-muted-foreground mt-1 text-sm">
            서버가 정확히 3개의 제안을 반환해야 합니다. 다시 시도해 주세요.
          </p>
          <Button className="mt-3" variant="outline" onClick={() => void confirmDiffReview()}>
            제안 다시 생성
          </Button>
        </div>
      ) : null}

      {step === 'repository-bind' && repositoryBinding ? (
        <RepositoryBindSection
          allowedModes={allowedRepositoryModes}
          binding={repositoryBinding}
          repositories={githubRepositories}
          selectedRepositoryId={selectedRepositoryId}
          onSelectRepository={(value) => {
            setSelectedRepositoryId(value);
            setRepositoryBinding(bindingForMode('EXISTING_OWNED', value));
          }}
          onChangeMode={(mode) => {
            setRepositoryBinding(bindingForMode(mode, selectedRepositoryId));
          }}
          onContinue={enterPlanConfirm}
        />
      ) : null}

      {step === 'plan-confirm' && selectedProposal ? (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">범위 및 비목표 확인</h2>
          <div className="border-border space-y-3 rounded-xl border p-4 text-sm">
            <div>
              <h3 className="font-semibold">인용 요구사항</h3>
              <ul className="text-muted-foreground mt-1 list-disc pl-4">
                {selectedProposal.citedRequirements.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">인용 갭</h3>
              <ul className="text-muted-foreground mt-1 list-disc pl-4">
                {selectedProposal.citedGaps.map((item) => (
                  <li key={item.id}>{item.description}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">한정 성과</h3>
              <p className="text-muted-foreground mt-1">{selectedProposal.boundedOutcome}</p>
            </div>
            <div>
              <h3 className="font-semibold">비목표</h3>
              <ul className="text-muted-foreground mt-1 list-disc pl-4">
                {selectedProposal.nonGoals.length > 0 ? (
                  selectedProposal.nonGoals.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>없음</li>
                )}
              </ul>
            </div>
            <p className="text-muted-foreground text-xs">
              대상 공고: {targetHeader.company} · {targetHeader.role}
            </p>
          </div>
          <Button onClick={() => void createProjectRun()}>프로젝트 실행 만들기</Button>
        </section>
      ) : null}

      {confirmBusy && step === 'profile-review' ? (
        <OperationStatusPanel title="증거 스냅샷 확인 중" busy />
      ) : null}
    </div>
  );
}
