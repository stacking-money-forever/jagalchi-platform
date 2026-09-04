import type { RoadmapNode } from '@/features/roadmap-editor/types/editor.types';

import { apiClient } from './client';

import type { RealtimeTicket } from '@jagalchi/api-client';
import type { Edge } from '@xyflow/react';

export const issueRealtimeTicket = () => apiClient.post<RealtimeTicket>('/realtime/tickets');

export interface RoadmapGraph {
  schemaVersion: 1;
  nodes: RoadmapNode[];
  edges: Edge[];
}

export interface RoadmapRecord {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  tags: string[];
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  graph: RoadmapGraph;
  directoryId: string | null;
  forkedFromId: string | null;
  forkCount: number;
  likeCount: number;
  favoriteCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const READ_ONLY_PROJECT_RUN_TAGS = ['project-run', 'local-seed'] as const;

export function isReadOnlyProjectRunRoadmap(record: Pick<RoadmapRecord, 'tags'>): boolean {
  return READ_ONLY_PROJECT_RUN_TAGS.some((tag) => record.tags.includes(tag));
}

export interface RoadmapDomainEvent {
  id: string;
  sequence: string;
  operation: {
    type: string;
    targetId: string;
    value?: {
      action?: string;
      payload?: {
        next?: Record<string, unknown> | null;
        data?: Record<string, unknown> | null;
      };
    };
  };
}

export interface RoadmapListResponse {
  items: RoadmapRecord[];
  page: number;
  size: number;
  total: number;
}

export interface RoadmapListQuery {
  ownerId?: string;
  page?: number;
  size?: number;
  search?: string;
  tag?: string;
}

export const createDraftRoadmap = () =>
  apiClient.post<RoadmapRecord>('/roadmaps', {
    title: '새 로드맵',
    description: '',
    tags: [],
    visibility: 'PRIVATE',
    graph: { schemaVersion: 1, nodes: [], edges: [] },
  });

export const createOwnedRoadmap = (data: {
  title: string;
  description?: string;
  isPublic?: boolean;
}) =>
  apiClient.post<RoadmapRecord>('/roadmaps', {
    title: data.title,
    description: data.description ?? '',
    tags: [],
    visibility: data.isPublic ? 'PUBLIC' : 'PRIVATE',
    graph: { schemaVersion: 1, nodes: [], edges: [] },
  });

export const getEditableRoadmap = (roadmapId: string) =>
  apiClient.get<RoadmapRecord>(`/roadmaps/${roadmapId}`);

export const getPublicRoadmap = (roadmapId: string) =>
  apiClient.get<RoadmapRecord>(`/roadmaps/public/${roadmapId}`);

export const updateEditableRoadmap = (
  roadmapId: string,
  data: Partial<Pick<RoadmapRecord, 'title' | 'description' | 'tags' | 'visibility' | 'graph'>>,
) => apiClient.patch<RoadmapRecord>(`/roadmaps/${roadmapId}`, data);

export const getRoadmapDomainEvents = (roadmapId: string, after = 0) =>
  apiClient.get<{ events: RoadmapDomainEvent[]; currentSequence: number }>(
    `/roadmaps/${roadmapId}/events?after=${after}&limit=500`,
  );

export const listPublicRoadmaps = (filters: RoadmapListQuery = {}) => {
  const query = new URLSearchParams({
    page: String(filters.page ?? 1),
    size: String(filters.size ?? 50),
  });
  if (filters.ownerId) query.set('ownerId', filters.ownerId);
  if (filters.search) query.set('search', filters.search);
  if (filters.tag) query.set('tag', filters.tag);
  return apiClient.get<RoadmapListResponse>(`/roadmaps/public?${query.toString()}`);
};

export const listOwnedRoadmaps = (filters: Omit<RoadmapListQuery, 'ownerId'> = {}) => {
  const query = new URLSearchParams();
  if (filters.page !== undefined) query.set('page', String(filters.page));
  if (filters.size !== undefined) query.set('size', String(filters.size));
  if (filters.search) query.set('search', filters.search);
  if (filters.tag) query.set('tag', filters.tag);
  const qs = query.toString();
  return apiClient.get<RoadmapListResponse>(`/roadmaps/mine${qs ? `?${qs}` : ''}`);
};
