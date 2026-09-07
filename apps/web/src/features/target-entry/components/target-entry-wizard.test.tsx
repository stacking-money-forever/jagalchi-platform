import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CareerSnapshotRecord,
  EligibleGithubRepositoryDto,
  ProjectProposalRecord,
  ProjectProposalSetView,
  WorkflowOperationView,
} from '@jagalchi/api-client';

const mocks = vi.hoisted(() => ({
  cancelWorkflowOperation: vi.fn(),
  confirmCandidateProfileSnapshot: vi.fn(),
  confirmCareerDiffSnapshot: vi.fn(),
  createCareerDiffSnapshot: vi.fn(),
  createProjectRunOperation: vi.fn(),
  getCandidateProfileSnapshot: vi.fn(),
  getCareerTargetVersion: vi.fn(),
  getEligibleGithubRepositories: vi.fn(),
  getProjectProposalSet: vi.fn(),
  importCareerTarget: vi.fn(),
  pollUntilTerminal: vi.fn(),
  push: vi.fn(),
  startGithubProfileSnapshot: vi.fn(),
  startProjectProposalOperation: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('@jagalchi/api-client', () => {
  class MockApiResponseError extends Error {
    status: number;
    code?: string;

    constructor(status: number, code?: string, message = 'API request failed') {
      super(message);
      this.name = 'ApiResponseError';
      this.status = status;
      this.code = code;
    }
  }

  return {
    ApiResponseError: MockApiResponseError,
    FIXTURE_JOB_POSTING_URL: 'https://fixture.invalid/jobs/software-engineer',
    REPOSITORY_MODE_ORDER: ['EXISTING_OWNED', 'OPEN_SOURCE_CONTRIBUTION', 'MANUAL_GREENFIELD'],
    cancelWorkflowOperation: mocks.cancelWorkflowOperation,
    confirmCandidateProfileSnapshot: mocks.confirmCandidateProfileSnapshot,
    confirmCareerDiffSnapshot: mocks.confirmCareerDiffSnapshot,
    createCareerDiffSnapshot: mocks.createCareerDiffSnapshot,
    createProjectRunOperation: mocks.createProjectRunOperation,
    getCandidateProfileSnapshot: mocks.getCandidateProfileSnapshot,
    getCareerTargetVersion: mocks.getCareerTargetVersion,
    getEligibleGithubRepositories: mocks.getEligibleGithubRepositories,
    getProjectProposalSet: mocks.getProjectProposalSet,
    importCareerTarget: mocks.importCareerTarget,
    startGithubProfileSnapshot: mocks.startGithubProfileSnapshot,
    startProjectProposalOperation: mocks.startProjectProposalOperation,
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/hooks/use-feature-flag', () => ({
  useFeatureFlag: () => true,
}));

vi.mock('../hooks/use-workflow-operation', () => ({
  useWorkflowOperationPoller: () => ({
    pollUntilTerminal: mocks.pollUntilTerminal,
    stop: mocks.stop,
  }),
}));

vi.mock('../lib/transport', () => ({
  entryTransport: { request: vi.fn() },
}));

import { TargetEntryWizard } from './target-entry-wizard';

const CREATED_AT = '2026-09-04T00:00:00.000Z';
const FIXTURE_REPOSITORY: EligibleGithubRepositoryDto = {
  repositoryId: '9000001',
  name: 'verification-repository',
  fullName: 'fixture/verification-repository',
  private: true,
};

function pendingOperation(id: string): WorkflowOperationView {
  return {
    id,
    kind: 'fixture',
    state: 'PENDING',
    version: 1,
    attempt: 1,
    maxAttempts: 1,
    nextAttemptAt: null,
    result: null,
    error: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    body: {},
  };
}

function completedOperation(id: string, resourceId: string): WorkflowOperationView {
  return {
    ...pendingOperation(id),
    state: 'SUCCEEDED',
    result: {
      resourceType: 'fixture',
      resourceId,
      resourceHref: `/fixture/${resourceId}`,
    },
  };
}

function failedOperation(id: string, code: string): WorkflowOperationView {
  return {
    ...pendingOperation(id),
    state: 'FAILED',
    error: { code, retryable: true },
  };
}

const targetVersion: CareerSnapshotRecord = {
  id: 'target-version-1',
  ownerId: 'owner-1',
  schemaVersion: 1,
  payload: {
    company: 'Fixture Company',
    role: 'Software Engineer',
    citations: [],
  },
  createdAt: CREATED_AT,
  careerTargetId: 'career-target-1',
};

const profileSnapshot: CareerSnapshotRecord = {
  id: 'profile-snapshot-1',
  ownerId: 'owner-1',
  schemaVersion: 1,
  payload: {
    repositories: [
      {
        id: FIXTURE_REPOSITORY.repositoryId,
        fullName: FIXTURE_REPOSITORY.fullName,
      },
    ],
  },
  createdAt: CREATED_AT,
  state: 'DRAFT',
};

const confirmedProfileSnapshot: CareerSnapshotRecord = {
  ...profileSnapshot,
  state: 'CONFIRMED',
};

const diffSnapshot: CareerSnapshotRecord = {
  id: 'diff-snapshot-1',
  ownerId: 'owner-1',
  schemaVersion: 1,
  payload: { missing: [] },
  createdAt: CREATED_AT,
  state: 'DRAFT',
};

const confirmedDiffSnapshot: CareerSnapshotRecord = {
  ...diffSnapshot,
  state: 'CONFIRMED',
};

function proposal(
  id: string,
  rank: number,
  repositoryMode: 'EXISTING_OWNED' | 'OPEN_SOURCE_CONTRIBUTION' | 'MANUAL_GREENFIELD',
): ProjectProposalRecord {
  return {
    id,
    proposalSetId: 'proposal-set-1',
    blueprintVersionId: `blueprint-${rank}`,
    rank,
    payload: {
      title: `Proposal ${rank}`,
      repositoryMode,
      boundedOutcome: `Outcome ${rank}`,
    },
    createdAt: CREATED_AT,
  };
}

const proposalSet: ProjectProposalSetView = {
  id: 'proposal-set-1',
  ownerId: 'owner-1',
  schemaVersion: 1,
  payload: {},
  createdAt: CREATED_AT,
  proposals: [
    proposal('proposal-1', 1, 'MANUAL_GREENFIELD'),
    proposal('proposal-2', 2, 'EXISTING_OWNED'),
    proposal('proposal-3', 3, 'OPEN_SOURCE_CONTRIBUTION'),
  ],
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.importCareerTarget.mockResolvedValue(pendingOperation('target-import-op'));
  mocks.startGithubProfileSnapshot.mockResolvedValue(pendingOperation('profile-import-op'));
  mocks.startProjectProposalOperation.mockResolvedValue(pendingOperation('proposal-op'));
  mocks.getCareerTargetVersion.mockResolvedValue(targetVersion);
  mocks.getCandidateProfileSnapshot.mockResolvedValue(profileSnapshot);
  mocks.confirmCandidateProfileSnapshot.mockResolvedValue(confirmedProfileSnapshot);
  mocks.createCareerDiffSnapshot.mockResolvedValue(diffSnapshot);
  mocks.confirmCareerDiffSnapshot.mockResolvedValue(confirmedDiffSnapshot);
  mocks.getProjectProposalSet.mockResolvedValue(proposalSet);
  mocks.getEligibleGithubRepositories.mockResolvedValue([FIXTURE_REPOSITORY]);
  mocks.pollUntilTerminal.mockImplementation(async (operationId: string) => {
    const resourceIds: Record<string, string> = {
      'target-import-op': targetVersion.id,
      'profile-import-op': profileSnapshot.id,
      'proposal-op': proposalSet.id,
    };
    return completedOperation(operationId, resourceIds[operationId] ?? operationId);
  });
});

describe('TargetEntryWizard repository mode switching', () => {
  it('loads repositories when switching from a non-existing preferred mode', async () => {
    const user = userEvent.setup();
    render(<TargetEntryWizard />);

    await user.click(screen.getByRole('button', { name: '공고 가져오기' }));
    await screen.findByRole('heading', { name: '가져온 작업 정보 확인' });
    await user.click(screen.getByRole('button', { name: '이 내용으로 계속' }));
    await screen.findByRole('heading', { name: '준비 상태 확인' });
    await user.click(screen.getByRole('button', { name: '이 내용으로 계속' }));
    await screen.findByRole('heading', { name: '프로젝트 비교 및 선택' });

    expect(mocks.getEligibleGithubRepositories).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '저장소 연결로 계속' }));
    await screen.findByRole('heading', { name: '저장소 연결' });
    expect(
      screen.getByText(
        '새 작업으로 시작으로 시작합니다. 이 과정에서 저장소를 새로 만들거나 복제하지 않습니다.',
      ),
    ).toBeInTheDocument();
    expect(mocks.getEligibleGithubRepositories).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '기존 저장소' }));
    const repositoryOption = await screen.findByRole('option', {
      name: FIXTURE_REPOSITORY.fullName,
    });

    expect(repositoryOption).toHaveValue(FIXTURE_REPOSITORY.repositoryId);
    expect(mocks.getEligibleGithubRepositories).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '기존 저장소' }));
    expect(mocks.getEligibleGithubRepositories).toHaveBeenCalledTimes(1);
  });
});

describe('TargetEntryWizard decision groups and recovery', () => {
  it('shows three user decision groups and waits for explicit review confirmation', async () => {
    const user = userEvent.setup();
    render(<TargetEntryWizard />);

    expect(screen.getByRole('list', { name: '프로젝트 시작 단계' })).toHaveTextContent(
      '목표와 기존 작업',
    );
    expect(screen.getByRole('list', { name: '프로젝트 시작 단계' })).toHaveTextContent(
      '프로젝트 비교/선택',
    );
    expect(screen.getByRole('list', { name: '프로젝트 시작 단계' })).toHaveTextContent(
      '저장소 연결/시작',
    );
    expect(screen.queryByText(/Phase 2|WorkflowOperation|Retry-After/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '공고 가져오기' }));
    await screen.findByRole('heading', { name: '가져온 작업 정보 확인' });
    expect(mocks.confirmCandidateProfileSnapshot).not.toHaveBeenCalled();
    expect(mocks.confirmCareerDiffSnapshot).not.toHaveBeenCalled();
  });

  it('keeps the URL and exposes manual capture after a fetch failure', async () => {
    const user = userEvent.setup();
    mocks.pollUntilTerminal.mockResolvedValueOnce(
      failedOperation('target-import-op', 'TARGET_FETCH_FAILED'),
    );
    render(<TargetEntryWizard />);

    const url = screen.getByLabelText('공고 URL');
    await user.clear(url);
    await user.type(url, 'https://example.com/jobs/role');
    await user.click(screen.getByRole('button', { name: '공고 가져오기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('공고를 가져오지 못했습니다');
    expect(screen.getByLabelText('공고 URL')).toHaveValue('https://example.com/jobs/role');
    expect(screen.getByLabelText('수동 캡처 본문')).toBeInTheDocument();
  });
});
