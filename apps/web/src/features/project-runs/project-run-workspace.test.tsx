import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { ProjectRunWorkspace } from './project-run-workspace';

vi.mock('./hooks/use-project-run-projection', () => ({
  useProjectRunProjection: () => ({
    model: {
      runId: 'run-1',
      planRevision: 'plan-1:1',
      runState: 'READY',
      currentTaskId: null,
      recommendedTaskId: 'task-1',
      milestones: [],
      tasks: [],
      proof: null,
    },
  }),
}));
vi.mock('./views/project-run-focus-view', () => ({
  ProjectRunFocusView: () => <div>작업 문서</div>,
}));
vi.mock('./components/journey/journey-list', () => ({
  JourneyList: () => <div>여정 목록</div>,
}));
vi.mock('./components/journey/journey-map-canvas', () => ({
  JourneyMapCanvas: () => <div>여정 지도</div>,
}));
vi.mock('./views/project-run-proof-view', () => ({
  ProjectRunProofView: () => <div>실제 Proof 화면</div>,
}));

const run = {
  id: 'run-1',
  state: 'READY',
  version: 1,
  currentTaskId: null,
  recommendedTaskId: 'task-1',
  plan: { id: 'plan-1', schemaVersion: 1 },
  map: { nodes: [], edges: [] },
  tasks: [{ id: 'task-1' }],
  proof: null,
} as unknown as ProjectRunProjection;

describe('ProjectRunWorkspace', () => {
  it('keeps the action-first document and journey while exposing Proof in one disclosure', async () => {
    const user = userEvent.setup();
    render(<ProjectRunWorkspace run={run} />);

    expect(screen.getByText('작업 문서')).toBeInTheDocument();
    expect(screen.getByText('여정 목록')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

    const disclosure = screen.getByText('실행 증명과 발행 보기').closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    await user.click(screen.getByText('실행 증명과 발행 보기'));
    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByText('실제 Proof 화면')).toBeInTheDocument();
  });
});
