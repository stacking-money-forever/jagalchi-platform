/**
 * Deterministic projection derived from the fixture. This file is the
 * exemplar's stand-in for the Phase 2.2 production projection module:
 *
 * - `deriveCurrentPath`: path anchor is currentTaskId, else recommendedTaskId
 *   (UI_REFERENCE_PACK.md visual-hierarchy rule). Ancestor closure over
 *   prerequisite edges, forward closure over dependents, capped at the nearest
 *   milestone boundary forward. Tie-breaking is deterministic (plan order).
 * - `computeLayout`: Dagre top-to-bottom, computed only from plan + collapse
 *   state. Never on render/viewport events.
 *
 * Both are pure functions so Phase 2.2 can move them into the projection
 * module and pin them with test vectors.
 */

import dagre from '@dagrejs/dagre';

import type { RoadmapFixture, Task, TaskState } from './roadmap-fixture';

export type ZoomTier = 'overview' | 'task' | 'evidence';

export interface ExemplarNodeData extends Record<string, unknown> {
  kind: 'milestone' | 'task' | 'proof';
  task?: Task;
  milestoneId: string;
  milestoneTitle?: string;
  doneCount?: number;
  totalCount?: number;
  blockerCount?: number;
  collapsed?: boolean;
  zoomTier?: ZoomTier;
  proofState?: RoadmapFixture['proof'];
  onPath?: boolean;
}

export interface ExemplarNode {
  id: string;
  type: 'milestone' | 'task' | 'proof';
  position: { x: number; y: number };
  data: ExemplarNodeData;
  parentId?: string;
  extent?: 'parent';
  style?: { width: number; height: number };
}

export interface ExemplarEdge {
  id: string;
  source: string;
  target: string;
  kind: 'PREREQUISITE' | 'SEQUENCE';
}

export interface ExemplarGraph {
  nodes: ExemplarNode[];
  edges: ExemplarEdge[];
  /** task ids on the highlighted current path, in derivation order */
  pathTaskIds: string[];
}

export const PATH_ANCESTOR_EDGE = 'PREREQUISITE';

/** DAG ancestor closure of `anchor` over prerequisite edges. */
function ancestorsOf(tasks: Task[], anchorId: string): string[] {
  const byId: Record<string, Task> = {};
  for (const t of tasks) byId[t.id] = t;
  const out: string[] = [];
  const stack = [...byId[anchorId].prerequisiteIds];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined) break;
    if (out.includes(id)) continue;
    out.push(id);
    stack.push(...(byId[id]?.prerequisiteIds ?? []));
  }
  return out;
}

/** Direct and transitive dependents of `anchorId`. */
function dependentsOf(tasks: Task[], anchorId: string): string[] {
  const out: string[] = [];
  const stack = [anchorId];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === undefined) break;
    for (const t of tasks) {
      if (t.prerequisiteIds.includes(cur) && !out.includes(t.id)) {
        out.push(t.id);
        stack.push(t.id);
      }
    }
  }
  return out;
}

/**
 * Current path = completed ancestors ∪ {anchor} ∪ forward path to the end of
 * the anchor's milestone, then to the final milestone's Proof anchor. Forward
 * walk follows plan order (deterministic tie-break).
 */
export function deriveCurrentPath(fixture: RoadmapFixture): string[] {
  const anchorId = fixture.currentTaskId ?? fixture.recommendedTaskId;
  if (!anchorId) return [];
  const anchor = fixture.tasks.find((t) => t.id === anchorId);
  if (!anchor) return [];

  const path = new Set<string>();
  path.add(anchorId);

  // Ancestors: all of them highlight (completed prerequisite chain).
  for (const id of ancestorsOf(fixture.tasks, anchorId)) path.add(id);

  const anchorMilestone = anchor.milestoneId;
  // Forward: inside anchor's milestone, following dependents of the anchor.
  // Blockers and deferred tasks never join the forward path; the route
  // highlights only what carries work forward. Plan order is the tie-break.
  const forwardInMilestone = dependentsOf(fixture.tasks, anchorId).filter((id) => {
    const t = fixture.tasks.find((x) => x.id === id);
    return (
      t !== undefined &&
      t.milestoneId === anchorMilestone &&
      t.state !== 'BLOCKED' &&
      t.state !== 'DEFERRED'
    );
  });
  for (const id of forwardInMilestone) path.add(id);

  // Cross-milestone continuation toward Proof. A task joins the route when it
  // is contiguous with the path: every prerequisite is DONE, on the path, or
  // itself route-relevant (READY/VERIFYING/IN_PROGRESS — not blocked,
  // deferred, or done — and reachable from the path). Parallel READY siblings
  // and optional branches join only when a downstream task needs them.
  const routeRelevant: Record<string, boolean> = {};
  const isRouteRelevant = (id: string): boolean => {
    if (routeRelevant[id] !== undefined) return routeRelevant[id];
    routeRelevant[id] = false; // cycle guard; the plan DAG cannot revisit
    const t = fixture.tasks.find((x) => x.id === id);
    if (t === undefined) return false;
    if (
      t.state === 'BLOCKED' ||
      t.state === 'DEFERRED' ||
      t.state === 'DONE' ||
      t.state === 'LOCKED'
    ) {
      return false;
    }
    const reachable =
      path.has(id) ||
      t.prerequisiteIds.some((p) => {
        const pt = fixture.tasks.find((x) => x.id === p);
        return pt?.state === 'DONE' || path.has(p) || isRouteRelevant(p);
      });
    routeRelevant[id] = reachable;
    return reachable;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of fixture.tasks) {
      if (path.has(t.id)) continue;
      if (t.milestoneId === anchorMilestone) continue;
      // Blocked and deferred never join; locked optional tasks join only via
      // the required chain, so gate locked tasks by `required` too.
      if (t.state === 'BLOCKED' || t.state === 'DEFERRED') continue;
      if (t.state === 'LOCKED' && !t.required) continue;
      const satisfied = t.prerequisiteIds.every((p) => {
        const pt = fixture.tasks.find((x) => x.id === p);
        return pt?.state === 'DONE' || path.has(p) || isRouteRelevant(p);
      });
      if (t.prerequisiteIds.length > 0 && satisfied) {
        path.add(t.id);
        changed = true;
      }
    }
  }
  return [...path].filter((id) => fixture.tasks.some((t) => t.id === id));
}

export const NODE_W = 248;
export const NODE_H = 96;
export const MILESTONE_PAD_X = 28;
export const MILESTONE_PAD_TOP = 64;
export const MILESTONE_PAD_BOTTOM = 24;
export const MILESTONE_GAP_X = 96;
export const MILESTONE_GAP_Y = 72;

/**
 * Dagre top-to-bottom layout. Runs only when plan revision or collapse state
 * changes (caller responsibility). Collapsed milestones shrink to a single
 * summary node; their tasks are removed from the graph entirely.
 */
export function computeLayout(
  fixture: RoadmapFixture,
  pathTaskIds: string[],
  collapsedMilestoneIds: readonly string[],
): ExemplarGraph {
  const collapsed: Record<string, boolean> = {};
  for (const id of collapsedMilestoneIds) collapsed[id] = true;

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: 56, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  const visibleTasks = fixture.tasks.filter((t) => !collapsed[t.milestoneId]);
  const collapsedMilestones = fixture.milestones.filter((m) => collapsed[m.id]);

  for (const t of visibleTasks) g.setNode(t.id, { width: NODE_W, height: NODE_H });
  for (const m of collapsedMilestones) {
    g.setNode(`ms-${m.id}`, { width: NODE_W + 2 * MILESTONE_PAD_X, height: 72 });
  }
  g.setNode('proof', { width: NODE_W, height: 72 });

  for (const t of visibleTasks) {
    for (const p of t.prerequisiteIds) {
      if (visibleTasks.some((v) => v.id === p)) {
        g.setEdge(p, t.id);
      } else if (collapsed[fixture.tasks.find((x) => x.id === p)?.milestoneId ?? '']) {
        // Cross-collapse edge: land on the collapsed milestone node.
        const srcMilestone = fixture.tasks.find((x) => x.id === p)?.milestoneId;
        if (srcMilestone) g.setEdge(`ms-${srcMilestone}`, t.id);
      }
    }
  }
  // Collapsed milestone -> tasks that depend on anything inside it (already
  // added above); also sequence collapsed milestones into the flow.
  for (const m of collapsedMilestones) {
    const lastTask = [...fixture.tasks].reverse().find((t) => t.milestoneId === m.id);
    if (lastTask) {
      for (const dep of dependentsOf(fixture.tasks, lastTask.id)) {
        const dt = fixture.tasks.find((x) => x.id === dep);
        if (
          dt &&
          !collapsed[dt.milestoneId] &&
          !dt.prerequisiteIds.some((p) => {
            const pt = fixture.tasks.find((x) => x.id === p);
            return pt?.milestoneId === m.id;
          })
        ) {
          g.setEdge(`ms-${m.id}`, dep);
        }
      }
    }
  }

  dagre.layout(g);

  const nodes: ExemplarNode[] = [];
  const path: Record<string, boolean> = {};
  for (const id of pathTaskIds) path[id] = true;

  for (const t of visibleTasks) {
    const n = g.node(t.id);
    nodes.push({
      id: t.id,
      type: 'task',
      position: { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 },
      parentId: t.milestoneId,
      extent: 'parent',
      data: { kind: 'task', task: t, milestoneId: t.milestoneId, collapsed: false },
    });
  }

  // Milestone containers must precede children (React Flow sub-flow rule).
  for (const m of fixture.milestones) {
    if (collapsed[m.id]) {
      const n = g.node(`ms-${m.id}`);
      nodes.push({
        id: m.id,
        type: 'milestone',
        position: { x: n.x - (NODE_W / 2 + MILESTONE_PAD_X), y: n.y - 36 },
        data: {
          kind: 'milestone',
          milestoneId: m.id,
          milestoneTitle: m.title,
          collapsed: true,
          doneCount: fixture.tasks.filter((t) => t.milestoneId === m.id && t.state === 'DONE')
            .length,
          totalCount: fixture.tasks.filter((t) => t.milestoneId === m.id).length,
          blockerCount: fixture.tasks.filter((t) => t.milestoneId === m.id && t.state === 'BLOCKED')
            .length,
        },
      });
      continue;
    }
    const members = visibleTasks.filter((t) => t.milestoneId === m.id);
    const xs = members.map((t) => nodes.find((n) => n.id === t.id)!.position.x);
    const ys = members.map((t) => nodes.find((n) => n.id === t.id)!.position.y);
    const minX = Math.min(...xs) - MILESTONE_PAD_X;
    const minY = Math.min(...ys) - MILESTONE_PAD_TOP;
    const maxX = Math.max(...xs.map((x) => x + NODE_W)) + MILESTONE_PAD_X;
    const maxY = Math.max(...ys.map((y) => y + NODE_H)) + MILESTONE_PAD_BOTTOM;
    nodes.push({
      id: m.id,
      type: 'milestone',
      position: { x: minX, y: minY },
      style: { width: maxX - minX, height: maxY - minY },
      data: {
        kind: 'milestone',
        milestoneId: m.id,
        milestoneTitle: m.title,
        collapsed: false,
        doneCount: fixture.tasks.filter((t) => t.milestoneId === m.id && t.state === 'DONE').length,
        totalCount: fixture.tasks.filter((t) => t.milestoneId === m.id).length,
        blockerCount: fixture.tasks.filter((t) => t.milestoneId === m.id && t.state === 'BLOCKED')
          .length,
      },
    });
  }

  const proofDone = fixture.tasks.every((t) => t.state === 'DONE');
  const pn = g.node('proof');
  nodes.push({
    id: 'proof',
    type: 'proof',
    position: { x: pn.x - NODE_W / 2, y: pn.y - 36 },
    data: {
      kind: 'proof',
      milestoneId: 'm8',
      doneCount: proofDone ? 1 : 0,
      totalCount: 1,
    },
  });

  const edges: ExemplarEdge[] = [];
  const edgeIds: Record<string, boolean> = {};
  for (const t of visibleTasks) {
    for (const p of t.prerequisiteIds) {
      const pTask = fixture.tasks.find((x) => x.id === p);
      if (visibleTasks.some((v) => v.id === p)) {
        const id = `e-${p}-${t.id}`;
        if (!edgeIds[id]) {
          edgeIds[id] = true;
          edges.push({ id, source: p, target: t.id, kind: 'PREREQUISITE' });
        }
      } else if (pTask && collapsed[pTask.milestoneId]) {
        const id = `e-ms-${pTask.milestoneId}-${t.id}`;
        if (!edgeIds[id]) {
          edgeIds[id] = true;
          edges.push({ id, source: pTask.milestoneId, target: t.id, kind: 'PREREQUISITE' });
        }
      }
    }
  }
  for (const t of fixture.tasks.filter((x) => x.milestoneId === 'm8')) {
    if (!collapsed['m8'] && dependentsOf(fixture.tasks, t.id).length === 0) {
      edges.push({ id: `e-${t.id}-proof`, source: t.id, target: 'proof', kind: 'SEQUENCE' });
    }
  }

  return { nodes, edges, pathTaskIds: [...pathTaskIds] };
}

export const STATE_LABEL_KO: Record<TaskState, string> = {
  LOCKED: '잠김',
  READY: '시작 가능',
  IN_PROGRESS: '진행 중',
  BLOCKED: '막힘',
  DEFERRED: '보류',
  VERIFYING: '검증 중',
  DONE: '완료',
};
