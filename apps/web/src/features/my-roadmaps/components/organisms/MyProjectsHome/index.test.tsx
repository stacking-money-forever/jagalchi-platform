import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { MyProjectsHome } from './index';

const run = {
  id: '00000000-0000-4000-8000-000000000001',
  state: 'ACTIVE',
  version: 2,
  target: { company: '자갈치', role: '프론트엔드 개발자' },
  currentTaskId: 'task-1',
  recommendedTaskId: null,
  plan: { id: 'plan-1', schemaVersion: 1 },
  map: { nodes: [], edges: [] },
  tasks: [
    {
      id: 'task-1',
      title: '작업 화면 만들기',
      state: 'IN_PROGRESS',
      required: true,
      milestoneId: null,
      prerequisiteIds: [],
      purpose: 'p',
      acceptanceCriteria: [],
      evidenceRequirements: [],
    },
  ],
  proof: null,
} satisfies ProjectRunProjection;

describe('MyProjectsHome', () => {
  it('makes a loaded current task the first action without claiming global priority', () => {
    render(<MyProjectsHome runs={[run]} />);

    expect(screen.getByRole('heading', { name: '지금 이어갈 프로젝트' })).toBeVisible();
    expect(
      screen.getByText('불러온 프로젝트 중 현재 또는 다음 작업이 있는 항목입니다.'),
    ).toBeVisible();
    const featuredProject = screen.getByRole('region', { name: '지금 이어갈 프로젝트' });
    expect(within(featuredProject).getByText('현재 작업').parentElement).toHaveTextContent(
      '현재 작업 · 작업 화면 만들기',
    );
    expect(screen.getByRole('link', { name: '작업으로 가기' })).toHaveAttribute(
      'href',
      '/projects/00000000-0000-4000-8000-000000000001?task=task-1',
    );
  });

  it('keeps empty project feedback separate from the saved-roadmap library', () => {
    render(<MyProjectsHome runs={[]} canCreateProjectRun />);

    expect(screen.getByText('프로젝트 실행이 없습니다.')).toBeVisible();
    expect(screen.queryByText('아직 실행 과제가 없습니다')).toBeNull();
    expect(screen.getByRole('link', { name: '프로젝트 만들기' })).toHaveAttribute(
      'href',
      '/projects/new',
    );
  });
});
