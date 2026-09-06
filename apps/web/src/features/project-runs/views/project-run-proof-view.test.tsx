import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { ProjectRunProofView } from './project-run-proof-view';

vi.mock('../hooks/use-project-run-commands', () => ({
  useProjectRunCommands: () => ({
    bindPullRequest: { isPending: false, error: null, mutate: vi.fn() },
    publish: { isPending: false, mutate: vi.fn() },
    unpublish: { isPending: false, mutate: vi.fn() },
    reverify: { isPending: false, mutate: vi.fn() },
  }),
}));

const baseRun = {
  id: 'run-1',
  state: 'ACTIVE',
  version: 1,
  currentTaskId: null,
  recommendedTaskId: 'task-1',
  plan: { id: 'plan-1', schemaVersion: 1 },
  map: { nodes: [], edges: [] },
  tasks: [],
} satisfies Partial<ProjectRunProjection>;

describe('ProjectRunProofView', () => {
  it('shows repository binding even when proof is absent', () => {
    render(
      <ProjectRunProofView
        run={
          {
            ...baseRun,
            proof: null,
            repositoryBinding: {
              githubRepositoryId: '12345',
              repositoryName: 'fixture/verification-repository',
              pullNumber: 17,
              headSha: 'a'.repeat(40),
              pullUrl: 'https://github.com/fixture/verification-repository/pull/17',
            },
          } as ProjectRunProjection
        }
      />,
    );

    expect(screen.getByLabelText('저장소 바인딩')).toBeInTheDocument();
    expect(screen.getByText('fixture/verification-repository')).toBeInTheDocument();
    expect(screen.getByText('Proof 데이터가 아직 없습니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub 저장소')).toHaveValue('12345');
    expect(screen.getByLabelText('PR 번호')).toHaveValue(17);
  });

  it('shows actionable unmet binding copy when repository name is unavailable', () => {
    render(
      <ProjectRunProofView
        run={
          {
            ...baseRun,
            proof: null,
            repositoryBinding: undefined,
          } as ProjectRunProjection
        }
      />,
    );

    expect(screen.getByText('바인딩 정보가 없습니다.')).toBeInTheDocument();
    expect(
      screen.getByText('프로젝트 실행 생성 시 저장소를 연결하면 PR을 바인딩할 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('separates fixture verification provenance from verification and publication state', () => {
    render(
      <ProjectRunProofView
        run={
          {
            ...baseRun,
            proof: {
              summary: '현재 실행의 기계 검증 결과',
              validUntil: null,
              verification: { state: 'PASS', verifiedAt: '2026-09-07T00:00:00Z' },
              publication: { state: 'ACTIVE', publicId: 'public-proof-1' },
              facts: {
                snapshotId: '00000000-0000-4000-8000-000000000010',
                verificationLevel: 'MACHINE_VERIFIED',
                provider: 'fixture',
                repositoryId: '12345',
                repositoryName: 'fixture/verification-repository',
                pullNumber: 17,
                headSha: 'a'.repeat(40),
                observedAt: '2026-09-07T00:00:00Z',
                evaluations: [],
              },
            },
          } as ProjectRunProjection
        }
      />,
    );

    expect(screen.getByText('검증 통과')).toBeVisible();
    expect(screen.getByText('발행 발행됨')).toBeVisible();
    expect(screen.getByText('로컬 fixture')).toBeVisible();
    expect(screen.getByRole('note', { name: '검증 출처 안내' })).toHaveTextContent(
      '실제 GitHub 검증 결과가 아닙니다.',
    );
  });
});
