import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { RoadmapGraphModel } from '../../projection';
import { JourneyList } from './journey-list';

const model: RoadmapGraphModel = {
  runId: 'run-not-shown',
  runState: 'ACTIVE',
  currentTaskId: 'current-not-shown',
  recommendedTaskId: 'ready-not-shown',
  milestones: [{ id: 'stage-one', title: '준비 단계' }],
  tasks: [
    {
      id: 'current-not-shown',
      title: '이력서 초안 정리',
      state: 'IN_PROGRESS',
      required: true,
      milestoneId: 'stage-one',
      prerequisiteIds: [],
      purpose: '목적',
      acceptanceCriteria: [],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '결과',
      citationLabels: [],
      gapLabels: [],
    },
    {
      id: 'ready-not-shown',
      title: '지원서 맞춤 작성',
      state: 'READY',
      required: false,
      milestoneId: 'stage-one',
      prerequisiteIds: ['current-not-shown'],
      purpose: '목적',
      acceptanceCriteria: [],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '결과',
      citationLabels: [],
      gapLabels: [],
    },
    {
      id: 'blocked-not-shown',
      title: '증빙 자료 확인',
      state: 'BLOCKED',
      required: true,
      milestoneId: 'stage-one',
      prerequisiteIds: [],
      purpose: '목적',
      acceptanceCriteria: [],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '결과',
      blockedReason: '포트폴리오 링크가 필요합니다.',
      citationLabels: [],
      gapLabels: [],
    },
    {
      id: 'locked-not-shown',
      title: '면접 연습',
      state: 'LOCKED',
      required: true,
      milestoneId: 'stage-one',
      prerequisiteIds: ['current-not-shown'],
      purpose: '목적',
      acceptanceCriteria: [],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '결과',
      citationLabels: [],
      gapLabels: [],
    },
    {
      id: 'done-not-shown',
      title: '기본 정보 점검',
      state: 'DONE',
      required: true,
      milestoneId: 'ungrouped-stage',
      prerequisiteIds: [],
      purpose: '목적',
      acceptanceCriteria: [],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '결과',
      citationLabels: [],
      gapLabels: [],
    },
  ],
  proof: null,
};

describe('JourneyList', () => {
  it('keeps every task available and only selects the chosen task', async () => {
    const user = userEvent.setup();
    const onSelectTask = vi.fn();
    render(
      <JourneyList
        model={model}
        selectedTaskId="current-not-shown"
        currentTaskId="current-not-shown"
        onSelectTask={onSelectTask}
      />,
    );

    expect(screen.getByRole('heading', { name: '단계 미지정 작업' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(model.tasks.length);

    await user.click(screen.getByRole('button', { name: /지원서 맞춤 작성/ }));
    expect(onSelectTask).toHaveBeenCalledTimes(1);
    expect(onSelectTask).toHaveBeenCalledWith('ready-not-shown');
  });

  it('explains current, ready, optional, blocked, locked, and completed work without raw ids', () => {
    render(
      <JourneyList
        model={model}
        selectedTaskId="current-not-shown"
        currentTaskId="current-not-shown"
        onSelectTask={vi.fn()}
      />,
    );

    expect(screen.getByText('현재 작업 · 필수 작업')).toBeInTheDocument();
    expect(screen.getByText('선택 작업')).toBeInTheDocument();
    expect(screen.getByText('지금 시작할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('막힌 이유: 포트폴리오 링크가 필요합니다.')).toBeInTheDocument();
    expect(screen.getByText('선행 작업 완료 대기: 이력서 초안 정리')).toBeInTheDocument();
    expect(screen.getByText('완료된 작업입니다.')).toBeInTheDocument();
    expect(screen.queryByText('current-not-shown')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /면접 연습/ })).toHaveAccessibleName(
      '작업 선택: 면접 연습, 필수 작업, 상태 잠김',
    );
  });

  it('uses native button keyboard activation for selection', async () => {
    const user = userEvent.setup();
    const onSelectTask = vi.fn();
    render(
      <JourneyList
        model={model}
        selectedTaskId={null}
        currentTaskId="current-not-shown"
        onSelectTask={onSelectTask}
      />,
    );

    const readyTask = screen.getByRole('button', { name: /지원서 맞춤 작성/ });
    readyTask.focus();
    await user.keyboard('{Enter}');
    expect(onSelectTask).toHaveBeenCalledWith('ready-not-shown');

    const currentTask = within(screen.getByText('이력서 초안 정리').closest('li')!).getByRole(
      'button',
    );
    currentTask.focus();
    await user.keyboard(' ');
    expect(onSelectTask).toHaveBeenLastCalledWith('current-not-shown');
  });
});
