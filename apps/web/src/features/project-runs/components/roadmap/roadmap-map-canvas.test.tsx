import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoadmapGraphModel } from '../../projection';
import { RoadmapMapCanvas } from './roadmap-map-canvas';

vi.mock('@xyflow/react', () => {
  const PassThrough = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const ReactFlow = ({
    children,
    'aria-label': ariaLabel,
  }: {
    children?: ReactNode;
    'aria-label'?: string;
  }) => (
    <div aria-label={ariaLabel} role="img">
      {children}
    </div>
  );

  return {
    Background: PassThrough,
    BackgroundVariant: { Dots: 'dots' },
    Controls: PassThrough,
    Handle: PassThrough,
    Position: { Bottom: 'bottom', Top: 'top' },
    ReactFlow,
    useEdgesState: (initial: unknown) => [initial, vi.fn(), vi.fn()],
    useNodesState: (initial: unknown) => [initial, vi.fn(), vi.fn()],
    useReactFlow: () => ({
      fitView: vi.fn(),
      getViewport: () => ({ zoom: 1 }),
      setViewport: vi.fn(),
    }),
  };
});

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches: false })),
  });
});

const model: RoadmapGraphModel = {
  runId: 'run-1',
  runState: 'ACTIVE',
  currentTaskId: 'task-1',
  recommendedTaskId: null,
  milestones: [{ id: 'milestone-1', title: 'Milestone 1' }],
  tasks: [
    {
      id: 'task-1',
      title: 'Complete the verified local task',
      state: 'READY',
      required: true,
      milestoneId: 'milestone-1',

      prerequisiteIds: [],
      purpose: 'Exercise the project run locally.',
      acceptanceCriteria: ['The configured adapter passes.'],
      evidenceRequirements: [],
      evidenceCount: 0,
      outcome: 'Ready to start',
      citationLabels: [],
      gapLabels: [],
    },
  ],
  proof: null,
};

describe('RoadmapMapCanvas detail rail', () => {
  it('uses a full-width mobile overlay while preserving the desktop rail', () => {
    render(<RoadmapMapCanvas model={model} pathTaskIds={['task-1']} />);

    const rail = screen.getByRole('complementary', {
      name: '작업 상세: Complete the verified local task',
    });

    expect(rail).toHaveClass('absolute', 'inset-0', 'z-20', 'h-full', 'w-full');
    expect(rail).toHaveClass(
      'lg:static',
      'lg:w-80',
      'lg:shrink-0',
      'lg:border-l',
      'lg:shadow-none',
    );
    expect(screen.getByRole('button', { name: '상세 닫기' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '현재 작업 열기: Complete the verified local task' }),
    ).toBeInTheDocument();
  });
});
