import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { ProjectRunLive } from './project-run-live';

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ initialData }: { initialData: ProjectRunProjection }) => ({ data: initialData }),
}));
vi.mock('./project-run-workspace', () => ({
  ProjectRunWorkspace: () => <div data-testid="workspace" />,
}));

const run = {
  id: 'run-1',
  state: 'ACTIVE',
  version: 1,
  currentTaskId: null,
  recommendedTaskId: null,
  target: { company: '자갈치', role: '프론트엔드 개발자' },
  plan: { id: 'plan', schemaVersion: 1 },
  map: { nodes: [], edges: [] },
  tasks: [],
  proof: null,
} as unknown as ProjectRunProjection;

describe('ProjectRunLive', () => {
  it('returns to the project collection instead of the home route', () => {
    render(<ProjectRunLive initialRun={run} />);
    expect(screen.getByRole('link', { name: '내 프로젝트로 돌아가기' })).toHaveAttribute(
      'href',
      '/myroadmap',
    );
  });
});
