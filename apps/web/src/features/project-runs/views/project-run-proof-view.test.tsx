import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { ProjectRunProofView } from './project-run-proof-view';

const commands = {
  bindPullRequest: { isPending: false, error: null, mutate: vi.fn() },
  publish: { isPending: false, mutate: vi.fn() },
  unpublish: { isPending: false, mutate: vi.fn() },
  reverify: { isPending: false, mutate: vi.fn() },
};
vi.mock('../hooks/use-project-run-commands', () => ({ useProjectRunCommands: () => commands }));

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
  it('keeps the no-proof state and project-wide binding scope readable', () => {
    render(
      <ProjectRunProofView
        run={{ ...baseRun, proof: null, repositoryBinding: undefined } as ProjectRunProjection}
      />,
    );
    expect(screen.getByLabelText('Proof 결과 없음')).toHaveTextContent(
      '아직 확인된 실행 결과가 없습니다',
    );
    expect(screen.getByLabelText('프로젝트 실행 PR 바인딩')).toHaveTextContent(
      '프로젝트 실행 전체에 적용됩니다',
    );
    expect(screen.queryByRole('button', { name: /발행|재검증/ })).not.toBeInTheDocument();
  });

  it('orders fixture result, conditions, account scope, and publication without a public-link promise', () => {
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
                evaluations: [
                  { ruleId: 'task-1:rule-0', type: 'MERGED_PR', passed: true, code: 'PASS' },
                ],
              },
            },
          } as ProjectRunProjection
        }
      />,
    );
    const result = screen.getByLabelText('실행 결과 요약');
    const conditions = screen.getByLabelText('검증 조건과 출처');
    const scope = screen.getByLabelText('설명 범위');
    const publication = screen.getByLabelText('실행 발행 상태');
    expect(
      result.compareDocumentPosition(conditions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      conditions.compareDocumentPosition(scope) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      scope.compareDocumentPosition(publication) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('note', { name: 'fixture 한계' })).toHaveTextContent(
      '실제 GitHub 검증 또는 공개 증명도 아닙니다.',
    );
    expect(screen.getByText('PR 병합 1')).toBeVisible();
    expect(screen.getByRole('link', { name: '계정 프로필 관리로 이동' })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(publication).toHaveTextContent(
      '계정 Proof Profile 활성화, lease 유효성, 또는 공개 리소스의 존재를 뜻하지 않습니다.',
    );
    expect(screen.queryByText('public-proof-1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이 실행의 발행 취소' })).toBeVisible();
  });

  it('offers one state-valid recovery action and hides it while server work is pending', () => {
    const staleProof = {
      summary: '',
      validUntil: null,
      verification: { state: 'STALE', verifiedAt: null },
      publication: { state: 'UNPUBLISHED', publicId: null },
    };
    const { rerender } = render(
      <ProjectRunProofView run={{ ...baseRun, proof: staleProof } as ProjectRunProjection} />,
    );
    expect(screen.getByRole('button', { name: '재검증 요청' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /발행/ })).not.toBeInTheDocument();
    rerender(
      <ProjectRunProofView
        run={
          {
            ...baseRun,
            pendingOperation: { id: 'operation-1', kind: 'PROOF_REVERIFICATION' },
            proof: staleProof,
          } as ProjectRunProjection
        }
      />,
    );
    expect(screen.getByLabelText('진행 중인 작업')).toHaveTextContent(
      '추가 발행 또는 재검증 요청을 보낼 수 없습니다.',
    );
    expect(screen.queryByRole('button', { name: /발행|재검증/ })).not.toBeInTheDocument();
  });
});
