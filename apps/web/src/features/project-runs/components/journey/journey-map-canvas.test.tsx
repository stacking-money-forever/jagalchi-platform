import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { RoadmapGraphModel } from '../../projection';
import { JourneyMapCanvas } from './journey-map-canvas';

vi.mock('@xyflow/react', () => ({
  Background: () => null,
  BackgroundVariant: { Dots: 'dots' },
  Controls: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Bottom: 'bottom', Top: 'top' },
  ReactFlow: ({
    nodes,
    nodeTypes,
    children,
  }: {
    nodes: Array<{ id: string; type: string; data: unknown }>;
    nodeTypes: Record<string, (props: { data: unknown }) => ReactNode>;
    children?: ReactNode;
  }) => (
    <div>
      {nodes.map((node) => {
        const NodeComponent = nodeTypes[node.type];
        return NodeComponent ? <NodeComponent key={node.id} data={node.data} /> : null;
      })}
      {children}
    </div>
  ),
}));

const model: RoadmapGraphModel = {
  runId: 'run',
  runState: 'ACTIVE',
  currentTaskId: 'prepare',
  recommendedTaskId: null,
  milestones: [{ id: 'stage', title: '준비' }],
  proof: null,
  tasks: [
    {
      id: 'prepare',
      title: '요구 사항 정리',
      state: 'DONE',
      required: true,
      milestoneId: 'stage',
      prerequisiteIds: [],
      purpose: '',
      acceptanceCriteria: [],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '',
      citationLabels: [],
      gapLabels: [],
    },
    {
      id: 'ship',
      title: '변경 사항 제출',
      state: 'READY',
      required: false,
      milestoneId: null,
      prerequisiteIds: ['prepare'],
      purpose: '',
      acceptanceCriteria: [],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: '',
      citationLabels: [],
      gapLabels: [],
    },
  ],
};

describe('JourneyMapCanvas', () => {
  it('renders human relationships and selection without task-body DOM ids', async () => {
    const onSelectTask = vi.fn();
    render(
      <JourneyMapCanvas
        model={model}
        selectedTaskId={null}
        currentTaskId="prepare"
        onSelectTask={onSelectTask}
      />,
    );

    expect(screen.getByRole('button', { name: /변경 사항 제출: 시작 가능/ })).toHaveTextContent(
      '선행: 요구 사항 정리',
    );
    expect(screen.getByRole('button', { name: /변경 사항 제출: 시작 가능/ })).toHaveTextContent(
      '선택 작업',
    );
    expect(document.querySelector('#task-ship')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /변경 사항 제출: 시작 가능/ }));
    expect(onSelectTask).toHaveBeenCalledWith('ship');
  });
});
