import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import type { RoadmapGraphModel } from '../projection';
import { ProjectRunFocusView } from './project-run-focus-view';

const mutate = vi.fn();
vi.mock('../hooks/use-project-run-commands', () => ({
  useProjectRunCommands: () => ({
    start: { isPending: false, error: new Error('STALE_PROJECTION'), mutate },
    defer: { isPending: false, error: null, mutate },
    block: { isPending: false, error: null, mutate },
    resume: { isPending: false, error: null, mutate },
    verify: { isPending: false, error: null, mutate },
    aiHelp: { isPending: false, error: null, data: undefined, mutate },
    publish: { isPending: false, error: null, mutate },
    unpublish: { isPending: false, error: null, mutate },
    reverify: { isPending: false, error: null, mutate },
  }),
}));

const model: RoadmapGraphModel = {
  runId: 'run-1',
  planRevision: 'plan-1:1',
  runState: 'ACTIVE',
  currentTaskId: 'task-1',
  recommendedTaskId: 'task-2',
  milestones: [{ id: 'm1', title: '준비' }],
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
      title: '다른 준비 작업',
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
  proof: null,
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
  it('exposes all task transitions and a stale projection error', () => {
    render(<ProjectRunFocusView run={run} model={model} selectedTaskId="task-1" />);
    expect(screen.getByRole('button', { name: '막힘 기록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검증 요청' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('STALE_PROJECTION');
    expect(screen.getByRole('heading', { name: '현재 작업 AI 도움' })).toBeInTheDocument();
  });

  it('does not expose AI help for an alternate non-active task', () => {
    render(<ProjectRunFocusView run={run} model={model} selectedTaskId="task-2" />);
    expect(screen.queryByRole('heading', { name: '현재 작업 AI 도움' })).not.toBeInTheDocument();
    expect(screen.getByText('AI 도움은 현재 작업에서만 요청할 수 있습니다.')).toBeInTheDocument();
  });
});
