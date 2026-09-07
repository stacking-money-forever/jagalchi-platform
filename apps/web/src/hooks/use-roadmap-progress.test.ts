import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sessionPresentAtom } from '@/lib/auth-atoms';
import { createTestWrapper } from '@/test-utils';

const roadmapId = '11111111-1111-4111-8111-111111111111';

vi.mock('@/api/roadmap', () => ({
  getMyProgress: vi.fn().mockResolvedValue({
    roadmapId: '11111111-1111-4111-8111-111111111111',
    totalNodes: 5,
    completedNodes: 2,
    progressPercentage: 40,
    completedNodeIds: ['node-1', 'node-2'],
    updatedAt: '2026-01-01T00:00:00.000Z',
  }),
  completeNode: vi.fn().mockResolvedValue({
    nodeId: 'node-3',
    isCompleted: true,
    roadmapProgress: 60,
    completedAt: '2026-01-01T00:00:00.000Z',
  }),
}));

import { completeNode, getMyProgress } from '@/api/roadmap';

import { useCompleteNode, useRoadmapProgress } from './use-roadmap-progress';

describe('useRoadmapProgress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches progress for a UUID roadmap', async () => {
    const { result } = renderHook(() => useRoadmapProgress(roadmapId), {
      wrapper: createTestWrapper([[sessionPresentAtom, true]] as const),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(getMyProgress).toHaveBeenCalledWith(roadmapId);
    expect(result.current.data?.progressPercentage).toBe(40);
  });

  it('does not fetch when roadmapId is empty', () => {
    const { result } = renderHook(() => useRoadmapProgress(''), {
      wrapper: createTestWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
    expect(getMyProgress).not.toHaveBeenCalled();
  });
});

describe('useCompleteNode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls completeNode with string identities', async () => {
    const { result } = renderHook(() => useCompleteNode(roadmapId), {
      wrapper: createTestWrapper(),
    });
    result.current.mutate({ nodeId: 'node-3', isCompleted: true });
    await waitFor(() =>
      expect(completeNode).toHaveBeenCalledWith(roadmapId, 'node-3', {
        isCompleted: true,
      }),
    );
  });

  it('passes optional link param', async () => {
    const { result } = renderHook(() => useCompleteNode(roadmapId), {
      wrapper: createTestWrapper(),
    });
    result.current.mutate({
      nodeId: 'node-3',
      isCompleted: true,
      link: 'https://example.com',
    });
    await waitFor(() =>
      expect(completeNode).toHaveBeenCalledWith(roadmapId, 'node-3', {
        isCompleted: true,
        link: 'https://example.com',
      }),
    );
  });
});
