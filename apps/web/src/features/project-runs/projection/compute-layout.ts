/**
 * Dagre layout for the read-only execution roadmap map.
 */

import dagre from '@dagrejs/dagre';

import type {
  RoadmapEdge,
  RoadmapGraph,
  RoadmapGraphModel,
  RoadmapNode,
  RoadmapTask,
} from './types';

function dependentsOf(tasks: RoadmapTask[], anchorId: string): string[] {
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
  model: RoadmapGraphModel,
  pathTaskIds: string[],
  collapsedMilestoneIds: readonly string[],
): RoadmapGraph {
  const collapsed: Record<string, boolean> = {};
  for (const id of collapsedMilestoneIds) collapsed[id] = true;

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: 56, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  const visibleTasks = model.tasks.filter((t) => !collapsed[t.milestoneId]);
  const collapsedMilestones = model.milestones.filter((m) => collapsed[m.id]);

  for (const t of visibleTasks) g.setNode(t.id, { width: NODE_W, height: NODE_H });
  for (const m of collapsedMilestones) {
    g.setNode(`ms-${m.id}`, { width: NODE_W + 2 * MILESTONE_PAD_X, height: 72 });
  }
  g.setNode('proof', { width: NODE_W, height: 72 });

  for (const t of visibleTasks) {
    for (const p of t.prerequisiteIds) {
      if (visibleTasks.some((v) => v.id === p)) {
        g.setEdge(p, t.id);
      } else if (collapsed[model.tasks.find((x) => x.id === p)?.milestoneId ?? '']) {
        // Cross-collapse edge: land on the collapsed milestone node.
        const srcMilestone = model.tasks.find((x) => x.id === p)?.milestoneId;
        if (srcMilestone) g.setEdge(`ms-${srcMilestone}`, t.id);
      }
    }
  }
  // Collapsed milestone -> tasks that depend on anything inside it (already
  // added above); also sequence collapsed milestones into the flow.
  for (const m of collapsedMilestones) {
    const lastTask = [...model.tasks].reverse().find((t) => t.milestoneId === m.id);
    if (lastTask) {
      for (const dep of dependentsOf(model.tasks, lastTask.id)) {
        const dt = model.tasks.find((x) => x.id === dep);
        if (
          dt &&
          !collapsed[dt.milestoneId] &&
          !dt.prerequisiteIds.some((p) => {
            const pt = model.tasks.find((x) => x.id === p);
            return pt?.milestoneId === m.id;
          })
        ) {
          g.setEdge(`ms-${m.id}`, dep);
        }
      }
    }
  }

  dagre.layout(g);

  const nodes: RoadmapNode[] = [];
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
  for (const m of model.milestones) {
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
          doneCount: model.tasks.filter((t) => t.milestoneId === m.id && t.state === 'DONE').length,
          totalCount: model.tasks.filter((t) => t.milestoneId === m.id).length,
          blockerCount: model.tasks.filter((t) => t.milestoneId === m.id && t.state === 'BLOCKED')
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
        doneCount: model.tasks.filter((t) => t.milestoneId === m.id && t.state === 'DONE').length,
        totalCount: model.tasks.filter((t) => t.milestoneId === m.id).length,
        blockerCount: model.tasks.filter((t) => t.milestoneId === m.id && t.state === 'BLOCKED')
          .length,
      },
    });
  }

  const proofDone = model.tasks.every((t) => t.state === 'DONE');
  const pn = g.node('proof');
  nodes.push({
    id: 'proof',
    type: 'proof',
    position: { x: pn.x - NODE_W / 2, y: pn.y - 36 },
    data: {
      kind: 'proof',
      milestoneId: model.milestones[model.milestones.length - 1]?.id ?? 'proof',
      doneCount: proofDone ? 1 : 0,
      totalCount: 1,
    },
  });

  const edges: RoadmapEdge[] = [];
  const edgeIds: Record<string, boolean> = {};
  for (const t of visibleTasks) {
    for (const p of t.prerequisiteIds) {
      const pTask = model.tasks.find((x) => x.id === p);
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
  const lastMilestoneId = model.milestones[model.milestones.length - 1]?.id;
  if (lastMilestoneId) {
    for (const t of model.tasks.filter((x) => x.milestoneId === lastMilestoneId)) {
      if (!collapsed[lastMilestoneId] && dependentsOf(model.tasks, t.id).length === 0) {
        edges.push({ id: `e-${t.id}-proof`, source: t.id, target: 'proof', kind: 'SEQUENCE' });
      }
    }
  }

  return { nodes, edges, pathTaskIds: [...pathTaskIds] };
}
