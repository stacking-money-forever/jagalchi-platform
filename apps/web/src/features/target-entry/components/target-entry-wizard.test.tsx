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
    await screen.findByRole('heading', { name: 'GitHub 증거 스냅샷 검토' });
    await user.click(screen.getByRole('button', { name: '증거 스냅샷 확인' }));
    await screen.findByRole('heading', { name: 'Career Diff 검토' });
    await user.click(screen.getByRole('button', { name: 'Career Diff 확인' }));
    await screen.findByRole('heading', { name: '프로젝트 제안 비교' });

    expect(mocks.getEligibleGithubRepositories).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '저장소 연결로 계속' }));
    await screen.findByRole('heading', { name: '저장소 연결' });
    expect(
      screen.getByText('신규 프로젝트 모드는 별도 저장소 선택 없이 진행할 수 있습니다.'),
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
