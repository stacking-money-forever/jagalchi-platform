'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

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
  type RepositoryMode,
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

const SUPPORTED_SOURCES = ['공개 채용 URL', '공고 본문 붙여넣기 (URL이 없거나 가져오지 못했을 때)'];

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
  const [cancellation, setCancellation] = useState<'requested' | 'completed' | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [careerTargetId, setCareerTargetId] = useState<string | null>(null);
  const [targetVersion, setTargetVersion] = useState<CareerSnapshotRecord | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<CareerSnapshotRecord | null>(null);
  const [diffSnapshot, setDiffSnapshot] = useState<CareerSnapshotRecord | null>(null);
  const [proposals, setProposals] = useState<ProjectProposalRecord[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [repositoryBinding, setRepositoryBinding] = useState<RepositoryBindingDto | null>(null);
  const [githubRepositories, setGithubRepositories] = useState<EligibleGithubRepositoryDto[]>([]);
  const githubRepositoriesLoadedRef = useRef(false);
  const githubRepositoriesRequestRef = useRef<Promise<void> | null>(null);
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
    setCancellation(null);
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
        message: '입력과 확인한 내용을 유지했습니다. 다시 시도해 주세요.',
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
          setCancellation('completed');
          return;
        }
        if (finished.state === 'FAILED') {
          const mapped = mapWorkflowOperationFailure(finished.error);
          setFailure(mapped);
          if (isManualCaptureSuggested(mapped.code)) {
            setShowManualCapture(true);
            setStep('intake');
          }
          return;
        }
        await onSuccess(finished);
      } catch (error) {
        if ((error as Error).message === 'WORKFLOW_POLL_ABORTED') {
          setCancellation('requested');
          return;
        }
        if (!handleGateError(error)) {
          setFailure({
            title: '요청 처리 중 오류',
            message: '입력과 확인한 내용을 유지했습니다. 다시 시도해 주세요.',
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
      setCancellation('requested');
      return;
    }
    try {
      const cancelledOperation = await cancelWorkflowOperation(entryTransport, activeOperation.id, {
        idempotencyKey: createIdempotencyKey('cancel'),
        ifMatch: String(activeOperation.version),
      });
      setActiveOperation(cancelledOperation);
      setCancellation(cancelledOperation.state === 'CANCELLED' ? 'completed' : 'requested');
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
      const originalUrl = jobUrl.trim();
      return {
        input: {
          kind: 'MANUAL_CAPTURE',
          ...(originalUrl ? { originalUrl } : {}),
          sourceText: manualText.trim(),
        },
      };
    }

    const url = jobUrl.trim();
    if (!url) {
      throw new Error('JOB_URL_REQUIRED');
    }

    return {
      input: {
        kind: 'FETCHED_URL',
        url,
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
          title: '확인 내용을 저장하지 못했습니다',
          message: '선택한 내용은 그대로 남아 있습니다. 다시 시도해 주세요.',
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
          title: '확인 내용을 저장하지 못했습니다',
          message: '선택한 내용은 그대로 남아 있습니다. 다시 시도해 주세요.',
          retryable: true,
        });
      }
    } finally {
      setConfirmBusy(false);
    }
  }, [careerTargetId, diffGaps, diffReviewDraft, diffSnapshot, handleGateError, runOperation]);

  const loadEligibleGithubRepositories = useCallback(async () => {
    if (githubRepositoriesLoadedRef.current) return;
    if (githubRepositoriesRequestRef.current) {
      await githubRepositoriesRequestRef.current;
      return;
    }

    const request = getEligibleGithubRepositories(entryTransport).then((repos) => {
      githubRepositoriesLoadedRef.current = true;
      setGithubRepositories(repos);
    });
    githubRepositoriesRequestRef.current = request;
    try {
      await request;
    } finally {
      if (githubRepositoriesRequestRef.current === request) {
        githubRepositoriesRequestRef.current = null;
      }
    }
  }, []);

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
        await loadEligibleGithubRepositories();
      } catch (error) {
        handleGateError(error);
      }
    }
    setStep('repository-bind');
  }, [allowedRepositoryModes, handleGateError, loadEligibleGithubRepositories, selectedProposal]);

  const handleRepositoryModeChange = useCallback(
    (mode: RepositoryMode) => {
      setRepositoryBinding(bindingForMode(mode, selectedRepositoryId));
      if (mode !== 'EXISTING_OWNED') return;
      void loadEligibleGithubRepositories().catch((error: unknown) => {
        handleGateError(error);
      });
    },
    [handleGateError, loadEligibleGithubRepositories, selectedRepositoryId],
  );

  const enterPlanConfirm = useCallback(() => {
    if (!selectedProposal || !repositoryBinding) return;
    if (!isRepositoryBindingComplete(repositoryBinding.mode, repositoryBinding)) return;
    setStep('plan-confirm');
  }, [repositoryBinding, selectedProposal]);

  const createProjectRun = useCallback(async () => {
    if (!selectedProposalId || !profileSnapshot || !diffSnapshot || !repositoryBinding) return;
    if (!isRepositoryBindingComplete(repositoryBinding.mode, repositoryBinding)) return;
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
    if (step === 'profile-review') {
      void confirmProfileReview();
      return;
    }
    if (step === 'diff-review') {
      void confirmDiffReview();
      return;
    }
    if (step === 'proposals-generate') {
      void confirmDiffReview();
      return;
    }
    if (step === 'run-create') {
      void createProjectRun();
    }
  }, [
    beginIntake,
    beginProfileImport,
    confirmDiffReview,
    confirmProfileReview,
    createProjectRun,
    step,
  ]);

  const operationBusy =
    step === 'target-import' ||
    step === 'profile-import' ||
    step === 'proposals-generate' ||
    step === 'run-create';

  const operationTitle: Record<WizardStep, string> = {
    intake: '준비 중',
    'target-import': '공고 가져오는 중',
    'profile-import': '작업 정보를 가져오는 중',
    'profile-review': '가져온 작업 정보 확인',
    'diff-create': '준비 상태를 확인하는 중',
    'diff-review': '준비 상태 확인',
    'proposals-generate': '프로젝트를 준비하는 중',
    'proposals-review': '프로젝트 비교 및 선택',
    'repository-bind': '저장소 연결',
    'plan-confirm': '시작 내용 확인',
    'run-create': '프로젝트를 시작하는 중',
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
        <Button asChild className="mt-4" variant="outline">
          <Link href="/create">돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">새 프로젝트 시작</h1>
        <p className="text-muted-foreground text-sm">
          목표를 확인하고, 맞는 프로젝트와 시작 방법을 직접 선택하세요.
        </p>
        <ol className="grid gap-2 text-sm sm:grid-cols-3" aria-label="프로젝트 시작 단계">
          {[
            ['목표와 기존 작업', ['intake', 'target-import', 'profile-import', 'profile-review']],
            [
              '프로젝트 비교/선택',
              ['diff-create', 'diff-review', 'proposals-generate', 'proposals-review'],
            ],
            ['저장소 연결/시작', ['repository-bind', 'plan-confirm', 'run-create']],
          ].map(([label, steps], index) => (
            <li
              key={label as string}
              aria-current={(steps as string[]).includes(step) ? 'step' : undefined}
              className="border-border rounded-lg border px-3 py-2 font-medium"
            >
              {index + 1}. {label as string}
            </li>
          ))}
        </ol>
      </header>

      {operationBusy ? (
        <OperationStatusPanel
          title={operationTitle[step]}
          message="준비가 끝나면 다음 선택으로 이어집니다."
          busy={!failure && !cancellation}
          failure={failure}
          cancellation={cancellation}
          onRetry={retryCurrentOperation}
          onCancel={() => void cancelActiveOperation()}
        />
      ) : null}

      {failure && !operationBusy ? (
        <OperationStatusPanel failure={failure} onRetry={retryCurrentOperation} />
      ) : null}

      {step === 'intake' ? (
        <section className="space-y-4">
          <div className="border-border rounded-xl border p-4">
            <h2 className="font-semibold">목표를 가져오는 방법</h2>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-sm">
              {SUPPORTED_SOURCES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">공고 URL</span>
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
            <Button
              variant="outline"
              onClick={() => {
                setShowManualCapture(true);
                resetFailure();
              }}
            >
              수동 캡처 입력
            </Button>
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
          title={confirmBusy ? '확인 내용을 저장하는 중' : '준비 상태를 확인하는 중'}
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
          <h2 className="text-lg font-bold">프로젝트 비교 및 선택</h2>
          <p className="text-muted-foreground text-sm">
            각 프로젝트의 결과와 하지 않는 일을 비교한 뒤 하나를 선택하세요.
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
            아직 비교할 프로젝트를 준비하지 못했습니다. 입력과 확인한 내용은 그대로 남아 있습니다.
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
          onChangeMode={handleRepositoryModeChange}
          onContinue={enterPlanConfirm}
        />
      ) : null}

      {step === 'plan-confirm' && selectedProposal ? (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">시작 내용 확인</h2>
          <div className="border-border space-y-3 rounded-xl border p-4 text-sm">
            <div>
              <h3 className="font-semibold">이번 프로젝트에서 다룰 내용</h3>
              <ul className="text-muted-foreground mt-1 list-disc pl-4">
                {selectedProposal.citedRequirements.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">보완할 부분</h3>
              <ul className="text-muted-foreground mt-1 list-disc pl-4">
                {selectedProposal.citedGaps.map((item) => (
                  <li key={item.id}>{item.description}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">기대하는 결과</h3>
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
              대상: {targetHeader.company} · {targetHeader.role}
            </p>
          </div>
          <Button onClick={() => void createProjectRun()}>프로젝트 시작</Button>
        </section>
      ) : null}

      {confirmBusy && step === 'profile-review' ? (
        <OperationStatusPanel title="확인 내용을 저장하는 중" busy />
      ) : null}
    </div>
  );
}
