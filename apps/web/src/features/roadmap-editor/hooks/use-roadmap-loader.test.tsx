import { renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { edgesAtom, nodesAtom, roadmapTitleAtom } from '../stores/editor-atoms';
import { useRoadmapLoader } from './use-roadmap-loader';

import type { RoadmapNode } from '../types/editor.types';
import type { Edge } from '@xyflow/react';

const mocks = vi.hoisted(() => ({
  createDraftRoadmap: vi.fn(),
  getEditableRoadmap: vi.fn(),
  getRoadmapDomainEvents: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/api/roadmap-domain', () => ({
  createDraftRoadmap: mocks.createDraftRoadmap,
  getEditableRoadmap: mocks.getEditableRoadmap,
  getRoadmapDomainEvents: mocks.getRoadmapDomainEvents,
  isReadOnlyProjectRunRoadmap: (record: { tags: string[] }) =>
    record.tags.includes('project-run') || record.tags.includes('local-seed'),
}));

const now = '2025-12-15T14:30:00.000Z';

function createWrapper(store = createStore()) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

function createNode(id = 'node-1'): RoadmapNode {
  return {
    id,
    type: 'jagalchi-node',
    position: { x: 100, y: 50 },
    data: {
      label: 'HTML/CSS 기초',
      description: '웹 기초',
      resources: [],
      variant: 'blue',
      isLocked: false,
    },
  };
}

function createEdge(): Edge {
  return { id: 'edge-1-2', source: 'node-1', target: 'node-2' };
}

function mockRoadmapDetail(title = 'API 로드맵', tags: string[] = []) {
  mocks.getEditableRoadmap.mockResolvedValue({
    id: '11111111-1111-4111-8111-111111111111',
    title,
    description: 'API 설명',
    visibility: 'PRIVATE',
    tags,
    graph: { schemaVersion: 1, nodes: [], edges: [] },
    createdAt: now,
    updatedAt: now,
  });
}

describe('useRoadmapLoader', () => {
  beforeEach(() => {
    mocks.createDraftRoadmap.mockReset();
    mocks.getEditableRoadmap.mockReset();
    mocks.getRoadmapDomainEvents.mockReset();
    mocks.replace.mockClear();
  });

  it('replays durable Nest roadmap events into editor atoms', async () => {
    const store = createStore();
    const node = createNode();
    const edge = createEdge();
    mockRoadmapDetail();
    mocks.getRoadmapDomainEvents.mockResolvedValue({
      currentSequence: 4,
      events: [
        {
          id: 'evt-node',
          sequence: '1',
          operation: {
            type: 'NODE_CREATE',
            targetId: node.id,
            value: { payload: { next: node } },
          },
        },
        {
          id: 'evt-edge',
          sequence: '2',
          operation: {
            type: 'EDGE_CREATE',
            targetId: edge.id,
            value: { payload: { next: edge } },
          },
        },
        {
          id: 'evt-node-edit',
          sequence: '3',
          operation: {
            type: 'NODE_UPDATE',
            targetId: node.id,
            value: { payload: { next: { position: { x: 180, y: 90 } } } },
          },
        },
        {
          id: 'evt-title',
          sequence: '4',
          operation: {
            type: 'NODE_UPDATE',
            targetId: 'roadmap',
            value: { payload: { data: { title: '이벤트 제목' } } },
          },
        },
      ],
    });

    const { result } = renderHook(
      () => useRoadmapLoader({ roadmapId: '11111111-1111-4111-8111-111111111111' }),
      { wrapper: createWrapper(store) },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(mocks.getRoadmapDomainEvents).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      0,
    );
    expect(store.get(roadmapTitleAtom)).toBe('이벤트 제목');
    expect(store.get(nodesAtom)).toEqual([{ ...node, position: { x: 180, y: 90 } }]);
    expect(store.get(edgesAtom)).toEqual([edge]);
  });

  it('refuses project-run roadmaps before initializing editor state', async () => {
    const store = createStore();
    mockRoadmapDetail('Jagalchi Local Execution Roadmap', ['local-seed', 'project-run']);
    mocks.getRoadmapDomainEvents.mockResolvedValue({
      currentSequence: 0,
      events: [],
    });

    const { result } = renderHook(
      () => useRoadmapLoader({ roadmapId: '11111111-1111-4111-8111-111111111111' }),
      { wrapper: createWrapper(store) },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(
      '프로젝트 실행 전용 로드맵은 기존 편집기에서 열 수 없습니다.',
    );
    expect(store.get(nodesAtom)).toEqual([]);
    expect(store.get(edgesAtom)).toEqual([]);
    expect(store.get(roadmapTitleAtom)).toBe('새 실행 과제');
  });

  it('does not mask authoritative API failures with numeric local data', async () => {
    const store = createStore();
    mocks.getEditableRoadmap.mockRejectedValue(new Error('offline'));
    mocks.getRoadmapDomainEvents.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(
      () => useRoadmapLoader({ roadmapId: '11111111-1111-4111-8111-111111111111' }),
      {
        wrapper: createWrapper(store),
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('offline');
    expect(store.get(nodesAtom)).toEqual([]);
  });

  it('creates a persisted UUID draft before entering a new editor', async () => {
    mocks.createDraftRoadmap.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
    });
    const { result } = renderHook(() => useRoadmapLoader({ roadmapId: 'new' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mocks.createDraftRoadmap).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith('/editor/22222222-2222-4222-8222-222222222222');
  });
});
