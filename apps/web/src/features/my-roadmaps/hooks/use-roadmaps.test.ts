import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { sessionPresentAtom } from '@/lib/auth-atoms';
import { createTestWrapper } from '@/test-utils';

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
        { id: 'page-roadmap-1', title: 'Page Roadmap 1', tags: [] },
        { id: 'page-roadmap-2', title: 'Page Roadmap 2', tags: ['react'] },
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
