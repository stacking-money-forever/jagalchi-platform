export type TaskState =
  'LOCKED' | 'READY' | 'IN_PROGRESS' | 'BLOCKED' | 'DEFERRED' | 'VERIFYING' | 'DONE';

export type RoadmapMilestone = {
  id: string;
  title: string;
};

export type RoadmapTask = {
  id: string;
  title: string;
  state: TaskState;
  required: boolean;
  /** A task may legitimately be outside a named milestone. */
  milestoneId: string | null;
  prerequisiteIds: string[];
  purpose: string;
  acceptanceCriteria: string[];
  evidenceRequirements: string[];
  evidenceCount: number;
  outcome: string;
  blockedReason?: string;
  citationLabels: string[];
  gapLabels: string[];
};

export type RoadmapProofState = {
  verification: 'PENDING' | 'PASS' | 'FAIL' | 'STALE';
  publication: 'ACTIVE' | 'UNPUBLISHED' | 'INVALIDATED';
};

export type RoadmapGraphModel = {
  runId: string;
  /** Stable plan snapshot identity used for presentation-only persistence. */
  planRevision?: string;
  runState: 'READY' | 'ACTIVE' | 'BLOCKED' | 'COMPLETED' | 'ARCHIVED';
  currentTaskId: string | null;
  recommendedTaskId: string | null;
  milestones: RoadmapMilestone[];
  tasks: RoadmapTask[];
  proof: RoadmapProofState | null;
};

export type ZoomTier = 'overview' | 'task' | 'evidence';

export interface RoadmapNodeData extends Record<string, unknown> {
  kind: 'milestone' | 'task' | 'proof';
  task?: RoadmapTask;
  milestoneId: string;
  milestoneTitle?: string;
  doneCount?: number;
  totalCount?: number;
  blockerCount?: number;
  collapsed?: boolean;
  zoomTier?: ZoomTier;
  proofState?: RoadmapProofState | null;
  onPath?: boolean;
  onToggle?: (milestoneId: string) => void;
  onSelect?: (taskId: string) => void;
}

export interface RoadmapNode {
  id: string;
  type: 'milestone' | 'task' | 'proof';
  position: { x: number; y: number };
  data: RoadmapNodeData;
  parentId?: string;
  extent?: 'parent';
  style?: { width: number; height: number };
}

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
  kind: 'PREREQUISITE' | 'SEQUENCE';
}

export interface RoadmapGraph {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  pathTaskIds: string[];
}
