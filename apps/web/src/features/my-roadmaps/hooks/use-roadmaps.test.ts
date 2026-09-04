import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { sessionPresentAtom } from '@/lib/auth-atoms';
import { createTestWrapper } from '@/test-utils';

import type { RoadmapRecord } from '@/api/roadmap-domain';

vi.mock('@/api/roadmap-domain', () => ({
  isReadOnlyProjectRunRoadmap: (record: { tags: string[] }) =>
    record.tags.includes('project-run') || record.tags.includes('local-seed'),
  listOwnedRoadmaps: vi.fn().mockResolvedValue({
    items: [
      { id: 'roadmap-1', title: 'My Roadmap', tags: [] },
      { id: 'roadmap-2', title: 'Another Roadmap', tags: ['react'] },
      {
        id: 'project-run-roadmap',
        title: 'Jagalchi Local Execution Roadmap',
        tags: ['local-seed', 'project-run'],
      },
    ],
    page: 1,
    size: 50,
    total: 3,
  }),
}));

import { listOwnedRoadmaps } from '@/api/roadmap-domain';
import { useRoadmaps } from './use-roadmaps';

const wrapper = () => createTestWrapper([[sessionPresentAtom, true]] as const);

function createRoadmapRecord(id: string, title: string, tags: string[] = []): RoadmapRecord {
  return {
    id,
    ownerId: 'owner-1',
    title,
    description: '',
    tags,
    visibility: 'PRIVATE',
    graph: { schemaVersion: 1, nodes: [], edges: [] },
    directoryId: null,
    forkedFromId: null,
    forkCount: 0,
    likeCount: 0,
    favoriteCount: 0,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

describe('useRoadmaps', () => {
  it('returns loading state initially', () => {
    const { result } = renderHook(() => useRoadmaps(), { wrapper: wrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('loads all owned roadmaps by default', async () => {
    const { result } = renderHook(() => useRoadmaps(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listOwnedRoadmaps).toHaveBeenCalledWith({});
  });

  it('passes the canonical search query to the owned roadmap endpoint', async () => {
    const { result } = renderHook(() => useRoadmaps({ search: 'React' }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listOwnedRoadmaps).toHaveBeenCalledWith({ search: 'React' });
  });

  it('returns persisted roadmap data', async () => {
    const { result } = renderHook(() => useRoadmaps(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(2);
  });

  it('preserves the server total for a normal paginated response', async () => {
    vi.mocked(listOwnedRoadmaps).mockResolvedValueOnce({
      items: [
        createRoadmapRecord('page-roadmap-1', 'Page Roadmap 1'),
        createRoadmapRecord('page-roadmap-2', 'Page Roadmap 2', ['react']),
      ],
      page: 2,
      size: 2,
      total: 7,
    });

    const { result } = renderHook(() => useRoadmaps({ page: 2, size: 2 }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.total).toBe(7);
  });

  it('decrements the server total for a hidden current-page project-run roadmap', async () => {
    const { result } = renderHook(() => useRoadmaps(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items.map((roadmap) => roadmap.id)).toEqual([
      'roadmap-1',
      'roadmap-2',
    ]);
    expect(result.current.data?.total).toBe(2);
  });

  it('returns an error when the API fails', async () => {
    vi.mocked(listOwnedRoadmaps).mockRejectedValueOnce(new Error('Server error'));
    const { result } = renderHook(() => useRoadmaps(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
