import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { ProjectRunsSection } from './project-runs-section';

const run: ProjectRunProjection = {
  id: '00000000-0000-4000-8000-000000000001',
  state: 'ACTIVE',
  version: 2,
  updatedAt: '2026-09-07T00:00:00Z',
  target: { company: '자갈치', role: '백엔드 개발자' },
  currentTaskId: 'task-1',
  recommendedTaskId: null,
  plan: { id: 'plan-1', schemaVersion: 1 },
  map: { nodes: [], edges: [] },
  tasks: [
    {
      id: 'task-1',
      title: 'API 계약 작성',
      state: 'IN_PROGRESS',
      required: true,
      milestoneId: null,
      prerequisiteIds: [],
      purpose: '계약을 고정합니다.',
      acceptanceCriteria: ['계약 검사가 통과합니다.'],
      evidenceRequirements: ['계약 검사 결과'],
    },
  ],
  proof: null,
};

describe('ProjectRunsSection', () => {
  it('shows a read-only run summary and resumes the current task', () => {
    render(<ProjectRunsSection runs={[run]} />);

    expect(screen.getByRole('heading', { name: '프로젝트 실행' })).toBeVisible();
    expect(screen.getByText('자갈치 · 백엔드 개발자')).toBeVisible();
    expect(screen.getByText('진행 중')).toBeVisible();
    expect(screen.getByText('현재 작업').parentElement).toHaveTextContent(
      '현재 작업 · API 계약 작성',
    );
    expect(
      screen.getByRole('link', { name: '자갈치 · 백엔드 개발자 이어서 실행' }),
    ).toHaveAttribute('href', '/projects/00000000-0000-4000-8000-000000000001?task=task-1');
  });

  it('uses state-specific actions with destination-qualified accessible names', () => {
    render(
      <ProjectRunsSection
        runs={[
          {
            ...run,
            id: '00000000-0000-4000-8000-000000000002',
            state: 'BLOCKED',
            target: { company: '핀테크랩', role: '프론트엔드 개발자' },
          },
          {
            ...run,
            id: '00000000-0000-4000-8000-000000000003',
            state: 'COMPLETED',
            target: { company: '커머스팀', role: '풀스택 개발자' },
            currentTaskId: null,
            recommendedTaskId: null,
            tasks: [],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('link', { name: '핀테크랩 · 프론트엔드 개발자 막힘 확인' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: '커머스팀 · 풀스택 개발자 결과 확인' }),
    ).toHaveAttribute('href', '/projects/00000000-0000-4000-8000-000000000003');
  });

  it('shows loading and flag-aware empty feedback', () => {
    const { rerender } = render(<ProjectRunsSection runs={[]} isLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('불러오고 있습니다');

    rerender(<ProjectRunsSection runs={[]} canCreateProjectRun />);
    expect(screen.getByText('프로젝트 실행이 없습니다.')).toBeVisible();
    expect(screen.getByRole('link', { name: '새 프로젝트 실행 만들기' })).toHaveAttribute(
      'href',
      '/create',
    );

    rerender(<ProjectRunsSection runs={[]} canCreateProjectRun={false} />);
    expect(screen.queryByRole('link', { name: '새 프로젝트 실행 만들기' })).toBeNull();
  });

  it('offers retry without discarding rows and supports cursor pagination', () => {
    const onRetry = vi.fn();
    const onRetryNextPage = vi.fn();
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <ProjectRunsSection runs={[run]} isNextPageError onRetryNextPage={onRetryNextPage} />,
    );
    expect(screen.getByText('자갈치 · 백엔드 개발자')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetryNextPage).toHaveBeenCalledOnce();

    rerender(<ProjectRunsSection runs={[]} isError onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<ProjectRunsSection runs={[run]} hasNextPage onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
    expect(onLoadMore).toHaveBeenCalledOnce();

    rerender(
      <ProjectRunsSection runs={[run]} hasNextPage isFetchingNextPage onLoadMore={onLoadMore} />,
    );
    expect(screen.getByRole('button', { name: '불러오는 중' })).toBeDisabled();
  });
});
