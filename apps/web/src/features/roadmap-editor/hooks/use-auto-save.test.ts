import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  updateEditableRoadmap: vi.fn(async () => ({ id: 'roadmap-1' })),
}));

vi.mock('@/api/roadmap-domain', () => api);

import { useAutoSave } from './use-auto-save';

import type { RoadmapNode } from '../types/editor.types';
import type { Edge } from '@xyflow/react';

const makeNode = (id: string, label: string): RoadmapNode =>
  ({
    id,
    type: 'jagalchi-node',
    position: { x: 0, y: 0 },
    data: { label, description: '', resources: [], variant: 'white', isLocked: false },
  }) as RoadmapNode;

const makeEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
});

const roadmapId = '11111111-1111-4111-8111-111111111111';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.updateEditableRoadmap.mockResolvedValue({ id: roadmapId });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists the UUID roadmap graph through the Nest API', async () => {
    const nodes = [makeNode('n1', 'Node 1')];
    const edges = [makeEdge('e1', 'n1', 'n2')];

    renderHook(() => useAutoSave({ roadmapId, nodes, edges, title: 'Test', isEnabled: true }));

    await waitFor(() =>
      expect(api.updateEditableRoadmap).toHaveBeenCalledWith(roadmapId, {
        title: 'Test',
        graph: { schemaVersion: 1, nodes, edges },
      }),
    );
    expect(localStorage.length).toBe(0);
  });

  it('does not save when disabled', () => {
    renderHook(() =>
      useAutoSave({
        roadmapId,
        nodes: [makeNode('n1', 'Node 1')],
        edges: [],
        title: 'Test',
        isEnabled: false,
      }),
    );
    expect(api.updateEditableRoadmap).not.toHaveBeenCalled();
  });

  it('saves an edit made before the loaded baseline finishes debouncing', async () => {
    vi.useFakeTimers();
    const staleNodes = [makeNode('stale-node', 'Stale')];
    const loadedNodes = [makeNode('loaded-node', 'Loaded')];
    const editedNodes = [makeNode('loaded-node', 'Edited immediately')];

    const { rerender } = renderHook(
      ({ nodes, enabled }) =>
        useAutoSave({ roadmapId, nodes, edges: [], title: 'Test', isEnabled: enabled }),
      { initialProps: { nodes: staleNodes, enabled: false } },
    );

    rerender({ nodes: loadedNodes, enabled: true });
    rerender({ nodes: editedNodes, enabled: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(api.updateEditableRoadmap).toHaveBeenCalledWith(roadmapId, {
      title: 'Test',
      graph: { schemaVersion: 1, nodes: editedNodes, edges: [] },
    });
  });

  it('baselines loaded values before first enable and saves a later real edit', async () => {
    vi.useFakeTimers();
    const staleNodes = [makeNode('stale-node', 'Jagalchi Local Execution Roadmap')];
    const loadedNodes = [makeNode('legacy-node', 'Visual QA Legacy Roadmap')];
    const loadedEdges = [makeEdge('legacy-edge', 'legacy-node', 'next-node')];
    const previousRoadmapId = '22222222-2222-4222-8222-222222222222';

    const { rerender } = renderHook(
      ({ currentRoadmapId, nodes, edges, title, enabled }) =>
        useAutoSave({
          roadmapId: currentRoadmapId,
          nodes,
          edges,
          title,
          isEnabled: enabled,
        }),
      {
        initialProps: {
          currentRoadmapId: previousRoadmapId,
          nodes: staleNodes,
          edges: [] as Edge[],
          title: 'Jagalchi Local Execution Roadmap',
          enabled: false,
        },
      },
    );

    rerender({
      currentRoadmapId: roadmapId,
      nodes: loadedNodes,
      edges: loadedEdges,
      title: 'Visual QA Legacy Roadmap',
      enabled: true,
    });
    expect(api.updateEditableRoadmap).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(api.updateEditableRoadmap).not.toHaveBeenCalled();

    const editedNodes = [makeNode('legacy-node', 'Edited Legacy Roadmap')];
    rerender({
      currentRoadmapId: roadmapId,
      nodes: editedNodes,
      edges: loadedEdges,
      title: 'Edited Legacy Roadmap',
      enabled: true,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(api.updateEditableRoadmap).toHaveBeenCalledWith(roadmapId, {
      title: 'Edited Legacy Roadmap',
      graph: { schemaVersion: 1, nodes: editedNodes, edges: loadedEdges },
    });
  });

  it('skips an identical rerender after the prior save commits', async () => {
    const nodes = [makeNode('n1', 'Node 1')];
    const edges = [makeEdge('e1', 'n1', 'n2')];
    const { rerender } = renderHook(
      ({ title }) => useAutoSave({ roadmapId, nodes, edges, title, isEnabled: true }),
      { initialProps: { title: 'Test' } },
    );

    await waitFor(() => expect(api.updateEditableRoadmap).toHaveBeenCalledTimes(1));
    await act(async () => rerender({ title: 'Test' }));
    expect(api.updateEditableRoadmap).toHaveBeenCalledTimes(1);
  });

  it('surfaces API failures without marking the state as saved', async () => {
    const error = new Error('save failed');
    api.updateEditableRoadmap.mockRejectedValue(error);
    const listener = vi.fn();
    window.addEventListener('jagalchi:autosave-error', listener);

    renderHook(() =>
      useAutoSave({
        roadmapId,
        nodes: [makeNode('n1', 'Node 1')],
        edges: [],
        title: 'Test',
      }),
    );

    await waitFor(() => expect(listener).toHaveBeenCalled());
    const event = listener.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail).toBe(error);
    window.removeEventListener('jagalchi:autosave-error', listener);
  });
});
