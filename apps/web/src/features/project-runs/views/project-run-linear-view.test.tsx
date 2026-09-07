import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RoadmapGraphModel } from '../projection';
import { ProjectRunLinearView } from './project-run-linear-view';

const model: RoadmapGraphModel = {
  runId: 'run-1',
  planRevision: 'plan-1:1',
  runState: 'ACTIVE',
  currentTaskId: 'task-1',
  recommendedTaskId: 'task-2',
  milestones: [{ id: 'm1', title: '1. 준비' }],
  tasks: [
    {
      id: 'task-1',
      title: '첫 작업',
      state: 'IN_PROGRESS',
      required: true,
      milestoneId: 'm1',
      prerequisiteIds: [],
      purpose: '목적',
      acceptanceCriteria: ['기준'],
      evidenceRequirements: ['TEST'],
      evidenceCount: 0,
      outcome: '첫 결과',
      citationLabels: [],
      gapLabels: [],
    },
    {
      id: 'task-2',
      title: '선택 작업',
      state: 'READY',
      required: false,
      milestoneId: 'm1',
      prerequisiteIds: ['task-1'],
      purpose: '목적',
      acceptanceCriteria: ['기준'],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '선택 결과',
      citationLabels: [],
      gapLabels: [],
    },
  ],
  proof: null,
};

describe('ProjectRunLinearView', () => {
  it('renders the same task projection with stable links and selection', () => {
    const onTaskSelect = vi.fn();
    const onOpenFocus = vi.fn();
    render(
      <ProjectRunLinearView
        model={model}
        pathTaskIds={['task-1']}
        selectedTaskId="task-1"
        onTaskSelect={onTaskSelect}
        onOpenFocus={onOpenFocus}
      />,
    );

    expect(screen.getByRole('region', { name: '선형 로드맵' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '작업 링크: 첫 작업' })).toHaveAttribute(
      'href',
      '/projects/run-1?task=task-1#task-task-1',
    );
    const secondTask = within(screen.getAllByRole('article')[1]!);
    fireEvent.click(secondTask.getByRole('button', { name: '작업 선택: 선택 작업' }));
    fireEvent.click(secondTask.getByRole('button', { name: '포커스 열기' }));
    expect(onTaskSelect).toHaveBeenCalledWith('task-2');
    expect(onOpenFocus).toHaveBeenCalledWith('task-2');
  });

  it('exposes an empty milestone and empty projection state', () => {
    render(
      <ProjectRunLinearView
        model={{ ...model, milestones: [{ id: 'empty', title: '비어 있는 단계' }], tasks: [] }}
        pathTaskIds={[]}
        selectedTaskId={null}
        onTaskSelect={vi.fn()}
        onOpenFocus={vi.fn()}
      />,
    );
    expect(screen.getByText('이 마일스톤에 작업이 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('표시할 작업이 없습니다.')).toBeInTheDocument();
  });
});
