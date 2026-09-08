import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import type { RoadmapGraphModel } from '../projection';
import { ProjectRunFocusView } from './project-run-focus-view';

const mutate = vi.fn();
const commandErrors = vi.hoisted(() => ({
  start: null as unknown,
  defer: null as unknown,
  block: null as unknown,
  resume: null as unknown,
  verify: null as unknown,
  aiHelp: null as unknown,
  bindPullRequest: null as unknown,
}));
vi.mock('../hooks/use-project-run-commands', () => ({
  useProjectRunCommands: () => ({
    start: {
      isPending: false,
      get error() {
        return commandErrors.start;
      },
      mutate,
    },
    defer: {
      isPending: false,
      get error() {
        return commandErrors.defer;
      },
      mutate,
    },
    block: {
      isPending: false,
      get error() {
        return commandErrors.block;
      },
      mutate,
    },
    resume: {
      isPending: false,
      get error() {
        return commandErrors.resume;
      },
      mutate,
    },
    verify: {
      isPending: false,
      get error() {
        return commandErrors.verify;
      },
      mutate,
    },
    aiHelp: {
      isPending: false,
      data: null,
      get error() {
        return commandErrors.aiHelp;
      },
      mutate,
    },
    bindPullRequest: {
      isPending: false,
      get error() {
        return commandErrors.bindPullRequest;
      },
      mutate,
    },
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
  beforeEach(() => {
    commandErrors.start = null;
    commandErrors.defer = null;
    commandErrors.block = null;
    commandErrors.resume = null;
    commandErrors.verify = null;
    commandErrors.aiHelp = null;
    commandErrors.bindPullRequest = null;
  });

  it('keeps the known blocked reason with a server-supported resume action', async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    const blockedModel = {
      ...model,
      currentTaskId: null,
      tasks: [{ ...model.tasks[0], state: 'BLOCKED' as const }],
      recommendedTaskId: null,
    };
    const blockedRun = {
      ...run,
      currentTaskId: null,
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

  it('keeps a competing READY task from stealing Focus', () => {
    mutate.mockClear();
    render(<ProjectRunFocusView run={run} model={model} selectedTaskId="task-2" />);
    expect(screen.getByText(/다른 현재 작업이 진행 중/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '작업 시작' })).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('starts the server-recommended READY task when no competing current task exists', async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    const freshRun = {
      ...run,
      state: 'READY',
      currentTaskId: null,
      recommendedTaskId: 'task-2',
      eligibleReadyTaskIds: ['task-2'],
    } as unknown as ProjectRunProjection;
    const freshModel = { ...model, runState: 'READY' as const, currentTaskId: null };

    render(<ProjectRunFocusView run={freshRun} model={freshModel} selectedTaskId="task-2" />);
    await user.click(screen.getByRole('button', { name: '작업 시작' }));
    expect(mutate).toHaveBeenCalledWith({ taskId: 'task-2' });
  });

  it('keeps start unavailable when another current task owns Focus', () => {
    render(<ProjectRunFocusView run={run} model={model} selectedTaskId="task-2" />);
    expect(screen.queryByRole('button', { name: '작업 시작' })).not.toBeInTheDocument();
  });

  it('restores defer, block-note, and resume commands with task-scoped block drafts', async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    const optionalModel = {
      ...model,
      currentTaskId: null,
      tasks: model.tasks.map((task) =>
        task.id === 'task-2' ? { ...task, required: false } : task,
      ),
    };
    const noCurrentRun = {
      ...run,
      currentTaskId: null,
      eligibleReadyTaskIds: ['task-2'],
    } as unknown as ProjectRunProjection;
    const { rerender } = render(
      <ProjectRunFocusView run={run} model={model} selectedTaskId="task-1" />,
    );

    await user.type(screen.getByRole('textbox', { name: '막힘 기록 메모' }), '외부 검토 대기');
    await user.click(screen.getByRole('button', { name: '막힘 기록' }));
    expect(mutate).toHaveBeenCalledWith({
      taskId: 'task-1',
      reasonCode: 'USER_REQUESTED',
      note: '외부 검토 대기',
    });

    rerender(
      <ProjectRunFocusView run={noCurrentRun} model={optionalModel} selectedTaskId="task-2" />,
    );
    expect(screen.queryByRole('textbox', { name: '막힘 기록 메모' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '보류' }));
    expect(mutate).toHaveBeenCalledWith({ taskId: 'task-2' });

    const deferredModel = {
      ...optionalModel,
      tasks: optionalModel.tasks.map((task) =>
        task.id === 'task-2' ? { ...task, state: 'DEFERRED' as const } : task,
      ),
    };
    rerender(
      <ProjectRunFocusView run={noCurrentRun} model={deferredModel} selectedTaskId="task-2" />,
    );
    await user.click(screen.getByRole('button', { name: '작업 재개' }));
    expect(mutate).toHaveBeenCalledWith({ taskId: 'task-2' });

    rerender(<ProjectRunFocusView run={run} model={model} selectedTaskId="task-1" />);
    expect(screen.getByRole('textbox', { name: '막힘 기록 메모' })).toHaveValue('외부 검토 대기');
  });

  it('shows a command error only on the task and action that produced it', async () => {
    const user = userEvent.setup();
    commandErrors.block = new Error('BLOCK_FAILED');
    const { rerender } = render(
      <ProjectRunFocusView run={run} model={model} selectedTaskId="task-1" />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '막힘 기록' }));
    expect(screen.getByRole('alert')).toHaveTextContent('작업을 처리하지 못했습니다');

    rerender(<ProjectRunFocusView run={run} model={model} selectedTaskId="task-2" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
