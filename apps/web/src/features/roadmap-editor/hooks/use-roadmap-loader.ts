import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSetAtom } from 'jotai';

import { nodesAtom, edgesAtom, roadmapTitleAtom } from '../stores/editor-atoms';
import { hashNodes, hashEdges } from '../utils/fast-hash';

import type { RoadmapNode } from '../types/editor.types';
import type { Edge } from '@xyflow/react';

interface UseRoadmapLoaderProps {
  roadmapId: string;
}

interface UseRoadmapLoaderReturn {
  isLoading: boolean;
  error: string | null;
  initialNodes: string;
  initialEdges: string;
  initialTitle: string;
  retry: () => Promise<void>;
}

interface ApiRoadmap {
  nodes: RoadmapNode[];
  edges: Edge[];
  title: string;
}

interface DomainRoadmapEvent {
  operation: {
    type: string;
    targetId: string;
    value?: {
      payload?: {
        next?: Record<string, unknown> | null;
        data?: Record<string, unknown> | null;
      };
    };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRoadmapNode(value: unknown): value is RoadmapNode {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && isRecord(value.position) && isRecord(value.data);
}

function isEdge(value: unknown): value is Edge {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.target === 'string'
  );
}

function replayDomainEvents(events: DomainRoadmapEvent[], initial: ApiRoadmap): ApiRoadmap {
  return events.reduce<ApiRoadmap>((current, event) => {
    const operation = event.operation;
    const separator = operation.type.lastIndexOf('_');
    if (separator < 0) return current;
    const targetType = operation.type.slice(0, separator);
    const verb = operation.type.slice(separator + 1);
    const payload = operation.value?.payload;
    const nextState = payload?.next ?? payload?.data;
    if (typeof payload?.data?.title === 'string') {
      return { ...current, title: payload.data.title };
    }
    if (targetType === 'EDGE') {
      if (verb === 'DELETE') {
        return {
          ...current,
          edges: current.edges.filter((edge) => edge.id !== operation.targetId),
        };
      }
      if (!nextState) return current;
      const existing = current.edges.find((edge) => edge.id === operation.targetId);
      return {
        ...current,
        edges: existing
          ? current.edges.map((edge) =>
              edge.id === operation.targetId ? ({ ...edge, ...nextState } as Edge) : edge,
            )
          : isEdge(nextState)
            ? [...current.edges, nextState]
            : current.edges,
      };
    }
    if (!['NODE', 'SECTION', 'TEXT', 'GROUP', 'RESOURCE'].includes(targetType)) {
      return current;
    }
    if (verb === 'DELETE') {
      return { ...current, nodes: current.nodes.filter((node) => node.id !== operation.targetId) };
    }
    if (!nextState) return current;
    const existing = current.nodes.find((node) => node.id === operation.targetId);
    return {
      ...current,
      nodes: existing
        ? current.nodes.map((node) =>
            node.id === operation.targetId ? ({ ...node, ...nextState } as RoadmapNode) : node,
          )
        : isRoadmapNode(nextState)
          ? [...current.nodes, nextState]
          : current.nodes,
    };
  }, initial);
}

/** Load the authoritative UUID roadmap and replay its durable event log. */
async function loadRoadmapData(roadmapId: string): Promise<ApiRoadmap> {
  const { getEditableRoadmap, getRoadmapDomainEvents, isReadOnlyProjectRunRoadmap } =
    await import('@/api/roadmap-domain');
  const [detail, eventResult] = await Promise.all([
    getEditableRoadmap(roadmapId),
    getRoadmapDomainEvents(roadmapId, 0),
  ]);
  if (isReadOnlyProjectRunRoadmap(detail)) {
    throw new Error('프로젝트 실행 전용 로드맵은 기존 편집기에서 열 수 없습니다.');
  }
  return replayDomainEvents(eventResult.events, {
    title: detail.title,
    nodes: detail.graph.nodes,
    edges: detail.graph.edges,
  });
}

export function useRoadmapLoader({ roadmapId }: UseRoadmapLoaderProps): UseRoadmapLoaderReturn {
  const router = useRouter();
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setTitle = useSetAtom(roadmapTitleAtom);
  const newRoadmapRequestedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialNodes, setInitialNodes] = useState<string>('');
  const [initialEdges, setInitialEdges] = useState<string>('');
  const [initialTitle, setInitialTitle] = useState<string>('');

  useEffect(() => {
    const loadRoadmap = async () => {
      try {
        if (roadmapId === 'new' && newRoadmapRequestedRef.current) return;
        setIsLoading(true);
        setError(null);

        // Check if roadmapId is 'new' - create new roadmap
        if (roadmapId === 'new') {
          newRoadmapRequestedRef.current = true;
          const { createDraftRoadmap } = await import('@/api/roadmap-domain');
          const newRoadmap = await createDraftRoadmap();
          router.replace(`/editor/${newRoadmap.id}`);
          setIsLoading(false);
          return;
        }

        // UUID roadmaps are loaded only from the authoritative API.
        const roadmap = await loadRoadmapData(roadmapId);

        // Initialize editor state
        setNodes(roadmap.nodes);
        setEdges(roadmap.edges);
        setTitle(roadmap.title);

        // Store initial state for change detection (using fast hash)
        setInitialNodes(hashNodes(roadmap.nodes));
        setInitialEdges(hashEdges(roadmap.edges));
        setInitialTitle(roadmap.title);

        setIsLoading(false);
      } catch (err) {
        if (roadmapId === 'new') newRoadmapRequestedRef.current = false;
        setError(err instanceof Error ? err.message : '로드맵을 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    loadRoadmap();
  }, [roadmapId, router, setNodes, setEdges, setTitle]);

  const retry = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const roadmap = await loadRoadmapData(roadmapId);
      setNodes(roadmap.nodes);
      setEdges(roadmap.edges);
      setTitle(roadmap.title);
      setInitialNodes(hashNodes(roadmap.nodes));
      setInitialEdges(hashEdges(roadmap.edges));
      setInitialTitle(roadmap.title);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로드맵을 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    initialNodes,
    initialEdges,
    initialTitle,
    retry,
  };
}
