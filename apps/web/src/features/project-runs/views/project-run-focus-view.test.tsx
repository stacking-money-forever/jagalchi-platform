import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import type { RoadmapGraphModel } from '../projection';
import { ProjectRunFocusView } from './project-run-focus-view';

const mutate = vi.fn();
vi.mock('../hooks/use-project-run-commands', () => ({
  useProjectRunCommands: () => ({
    start: { isPending: false, error: null, mutate },
    defer: { isPending: false, error: null, mutate },
    block: { isPending: false, error: null, mutate },
    resume: { isPending: false, error: null, mutate },
    verify: { isPending: false, error: null, mutate },
    bindPullRequest: { isPending: false, error: null, mutate },
  }),
}));

const model: RoadmapGraphModel = {
  runId: 'run-1',
  planRevision: 'plan-1:1',
  runState: 'ACTIVE',
  currentTaskId: 'task-1',
  recommendedTaskId: 'task-2',
  milestones: [{ id: 'm1', title: '준비' }],
  proof: null,
  tasks: [
    {
      id: 'task-1',
      title: '현재 작업',
      state: 'IN_PROGRESS',
      required: true,
      milestoneId: 'm1',
      prerequisiteIds: [],
      purpose: '현재 목적',
      acceptanceCriteria: ['기준'],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '결과',
      citationLabels: [],
      gapLabels: [],
    },
    {
      id: 'task-2',
      title: '다음 작업',
      state: 'READY',
      required: true,
      milestoneId: 'm1',
      prerequisiteIds: [],
      purpose: '다음 목적',
      acceptanceCriteria: ['기준'],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '결과',
      citationLabels: [],
      gapLabels: [],
    },
  ],
};
const run = {
  id: 'run-1',
  state: 'ACTIVE',
  version: 4,
  currentTaskId: 'task-1',
  recommendedTaskId: 'task-2',
  plan: { id: 'plan-1', schemaVersion: 1 },
  map: { nodes: [], edges: [] },
  tasks: [],
  proof: null,
} as unknown as ProjectRunProjection;

describe('ProjectRunFocusView', () => {
  it('keeps the known blocked reason with a server-supported resume action', async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    const blockedModel = {
      ...model,
      tasks: [{ ...model.tasks[0], state: 'BLOCKED' as const }],
      recommendedTaskId: null,
    };
    const blockedRun = {
      ...run,
      recommendedTaskId: null,
      tasks: [{ id: 'task-1', verificationFailure: { note: '먼저 검증 로그를 확인하세요.' } }],
    } as unknown as ProjectRunProjection;
    render(<ProjectRunFocusView run={blockedRun} model={blockedModel} selectedTaskId="task-1" />);
    expect(screen.getByText('먼저 검증 로그를 확인하세요.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '작업 재개' }));
    expect(mutate).toHaveBeenCalledWith({ taskId: 'task-1' });
  });

  it('uses the existing repository binding and asks only for a PR number', async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    const boundRun = {
      ...run,
      repositoryBinding: {
        githubRepositoryId: '9007199254740993',
        repositoryName: 'jagalchi/web',
        pullNumber: null,
      },
    } as unknown as ProjectRunProjection;
    render(<ProjectRunFocusView run={boundRun} model={model} selectedTaskId="task-1" />);
    expect(screen.getByText(/연결된 저장소:/)).toHaveTextContent('jagalchi/web');
    expect(screen.queryByRole('textbox', { name: 'GitHub 저장소 ID' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'PR 번호' }), '42');
    await user.click(screen.getByRole('button', { name: 'PR 연결하기' }));
    expect(mutate).toHaveBeenCalledWith({ githubRepositoryId: '9007199254740993', pullNumber: 42 });
  });

  it('shows the server-valid binding recovery rather than an invalid verify action', () => {
    render(<ProjectRunFocusView run={run} model={model} selectedTaskId="task-1" />);
    expect(screen.getByRole('heading', { name: '현재 작업' })).toBeInTheDocument();
    expect(screen.getByText(/저장소와 PR이 필요합니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결과 확인 요청' })).not.toBeInTheDocument();
  });

  it('keeps a selected non-current task read-only', () => {
    mutate.mockClear();
    render(<ProjectRunFocusView run={run} model={model} selectedTaskId="task-2" />);
    expect(screen.getByText(/여정을 살펴보기 위한 선택/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '작업 시작' })).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
