import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { ProjectRunProofView } from './project-run-proof-view';

vi.mock('../hooks/use-project-run-commands', () => ({
  useProjectRunCommands: () => ({
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
      screen.getByText(
        '프로젝트 실행 생성 시 저장소를 연결하거나 PR 바인딩이 완료되면 여기에 표시됩니다.',
      ),
    ).toBeInTheDocument();
  });
});
