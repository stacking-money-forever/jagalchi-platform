import { useEffect, useMemo, useRef } from 'react';

import { updateEditableRoadmap } from '@/api/roadmap-domain';
import { useDebounce } from '@/hooks/use-debounce';
import { isEnabled } from '@/lib/feature-flags';

import { dispatchAction } from '../services/action-dispatcher';
import { hashEdges, hashNodes } from '../utils/fast-hash';

import type { RoadmapNode } from '../types/editor.types';
import type { Edge } from '@xyflow/react';

interface UseAutoSaveProps {
  roadmapId: string;
  nodes: RoadmapNode[];
  edges: Edge[];
  title: string;
  isEnabled?: boolean;
}

const isRealtimeEnabled = isEnabled('REALTIME_ENABLED');

export function useAutoSave({
  roadmapId,
  nodes,
  edges,
  title,
  isEnabled = true,
}: UseAutoSaveProps) {
  const prevNodesRef = useRef<string>('');
  const prevEdgesRef = useRef<string>('');
  const prevTitleRef = useRef<string>('');
  const activeRoadmapIdRef = useRef<string | null>(null);
  const wasEnabledRef = useRef(false);
  const pendingBaselineRef = useRef(false);
  const observedStaleBaselineRef = useRef(false);
  const saveSessionRef = useRef(0);
  const debouncedValues = useDebounce(
    useMemo(() => ({ nodes, edges, title }), [nodes, edges, title]),
    500,
  );
  const { nodes: debouncedNodes, edges: debouncedEdges, title: debouncedTitle } = debouncedValues;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const previousRoadmapId = activeRoadmapIdRef.current;
    if (!roadmapId) {
      if (wasEnabledRef.current) saveSessionRef.current += 1;
      activeRoadmapIdRef.current = null;
      wasEnabledRef.current = false;
      pendingBaselineRef.current = false;
      observedStaleBaselineRef.current = false;
      return;
    }

    const roadmapChanged = previousRoadmapId !== null && previousRoadmapId !== roadmapId;
    activeRoadmapIdRef.current = roadmapId;

    if (!isEnabled) {
      if (wasEnabledRef.current) saveSessionRef.current += 1;
      wasEnabledRef.current = false;
      pendingBaselineRef.current = false;
      observedStaleBaselineRef.current = false;
      return;
    }

    if (roadmapChanged) {
      saveSessionRef.current += 1;
      prevNodesRef.current = hashNodes(nodes);
      prevEdgesRef.current = hashEdges(edges);
      prevTitleRef.current = title;
      pendingBaselineRef.current = true;
      observedStaleBaselineRef.current = false;
      wasEnabledRef.current = false;
      return;
    }

    if (!wasEnabledRef.current) {
      if (previousRoadmapId !== null) {
        prevNodesRef.current = hashNodes(nodes);
        prevEdgesRef.current = hashEdges(edges);
        prevTitleRef.current = title;
        pendingBaselineRef.current = true;
        observedStaleBaselineRef.current = false;
        wasEnabledRef.current = true;
        return;
      }
      wasEnabledRef.current = true;
    }
  }, [roadmapId, isEnabled, nodes, edges, title]);

  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined' || !roadmapId) return;

    const currentNodesHash = hashNodes(debouncedNodes);
    const currentEdgesHash = hashEdges(debouncedEdges);
    const currentTitle = debouncedTitle;

    if (pendingBaselineRef.current) {
      if (
        currentNodesHash === prevNodesRef.current &&
        currentEdgesHash === prevEdgesRef.current &&
        currentTitle === prevTitleRef.current
      ) {
        pendingBaselineRef.current = false;
        observedStaleBaselineRef.current = false;
        wasEnabledRef.current = true;
        return;
      }
      if (!observedStaleBaselineRef.current) {
        observedStaleBaselineRef.current = true;
        return;
      }
      pendingBaselineRef.current = false;
      observedStaleBaselineRef.current = false;
    }

    const nodesChanged = currentNodesHash !== prevNodesRef.current;
    const edgesChanged = currentEdgesHash !== prevEdgesRef.current;
    const titleChanged = currentTitle !== prevTitleRef.current;

    if (!nodesChanged && !edgesChanged && !titleChanged) return;

    if (isRealtimeEnabled && titleChanged) {
      dispatchAction(roadmapId, 'EDIT', {
        type: 'INFO',
        target: { type: 'NODE', object: roadmapId },
        data: { title: debouncedTitle },
      });
    }

    const saveSession = saveSessionRef.current;
    void updateEditableRoadmap(roadmapId, {
      title: debouncedTitle,
      graph: {
        schemaVersion: 1,
        nodes: debouncedNodes,
        edges: debouncedEdges,
      },
    })
      .then(() => {
        if (saveSession !== saveSessionRef.current) return;
        prevNodesRef.current = currentNodesHash;
        prevEdgesRef.current = currentEdgesHash;
        prevTitleRef.current = currentTitle;
      })
      .catch((error: unknown) => {
        window.dispatchEvent(new CustomEvent('jagalchi:autosave-error', { detail: error }));
      });
  }, [debouncedNodes, debouncedEdges, debouncedTitle, roadmapId, isEnabled]);
}
