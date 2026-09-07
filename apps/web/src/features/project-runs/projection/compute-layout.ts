/** Dagre layout for the read-only execution roadmap map. */
import dagre from '@dagrejs/dagre';

import type {
  RoadmapEdge,
  RoadmapGraph,
  RoadmapGraphModel,
  RoadmapNode,
  RoadmapTask,
} from './types';

export const NODE_W = 248;
export const NODE_H = 96;
export const MILESTONE_PAD_X = 28;
export const MILESTONE_PAD_TOP = 64;
export const MILESTONE_PAD_BOTTOM = 24;
export const MILESTONE_GAP_X = 96;
export const MILESTONE_GAP_Y = 72;
export const UNGROUPED_MILESTONE_ID = '__ungrouped__';
const UNGROUPED_MILESTONE_TITLE = '분류되지 않은 작업';

function dependentsOf(tasks: RoadmapTask[], anchorId: string): string[] {
  const out: string[] = [];
  const stack = [anchorId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const task of tasks) {
      if (task.prerequisiteIds.includes(current) && !out.includes(task.id)) {
        out.push(task.id);
        stack.push(task.id);
      }
    }
  }
  return out;
}

/**
 * Produces finite milestone containers even for empty stages and keeps valid
 * tasks with a null milestone in a presentation-only ungrouped lane.
 */
export function computeLayout(
  model: RoadmapGraphModel,
  pathTaskIds: string[],
  collapsedMilestoneIds: readonly string[],
): RoadmapGraph {
  const collapsed = new Set(collapsedMilestoneIds);
  const knownMilestoneIds = new Set(model.milestones.map((milestone) => milestone.id));
  const groupId = (task: RoadmapTask): string =>
    task.milestoneId && knownMilestoneIds.has(task.milestoneId)
      ? task.milestoneId
      : UNGROUPED_MILESTONE_ID;
  const milestones = model.tasks.some((task) => groupId(task) === UNGROUPED_MILESTONE_ID)
    ? [...model.milestones, { id: UNGROUPED_MILESTONE_ID, title: UNGROUPED_MILESTONE_TITLE }]
    : model.milestones;
  const visibleTasks = model.tasks.filter((task) => !collapsed.has(groupId(task)));
  const collapsedMilestones = milestones.filter((milestone) => collapsed.has(milestone.id));
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: 56, marginx: 24, marginy: 24 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const task of visibleTasks) graph.setNode(task.id, { width: NODE_W, height: NODE_H });
  for (const milestone of collapsedMilestones) {
    graph.setNode(`ms-${milestone.id}`, { width: NODE_W + 2 * MILESTONE_PAD_X, height: 72 });
  }
  graph.setNode('proof', { width: NODE_W, height: 72 });

  for (const task of visibleTasks) {
    for (const prerequisiteId of task.prerequisiteIds) {
      if (visibleTasks.some((candidate) => candidate.id === prerequisiteId)) {
        graph.setEdge(prerequisiteId, task.id);
        continue;
      }
      const prerequisite = model.tasks.find((candidate) => candidate.id === prerequisiteId);
      if (prerequisite && collapsed.has(groupId(prerequisite))) {
        graph.setEdge(`ms-${groupId(prerequisite)}`, task.id);
      }
    }
  }
  dagre.layout(graph);

  const taskNodes: RoadmapNode[] = visibleTasks.map((task) => {
    const position = graph.node(task.id);
    return {
      id: task.id,
      type: 'task',
      position: { x: position.x - NODE_W / 2, y: position.y - NODE_H / 2 },
      parentId: groupId(task),
      extent: 'parent',
      data: { kind: 'task', task, milestoneId: groupId(task), collapsed: false },
    };
  });

  // Empty groups receive a finite fallback placement; no Math.min([]) layout.
  const containers: RoadmapNode[] = milestones.map((milestone, index) => {
    const allMembers = model.tasks.filter((task) => groupId(task) === milestone.id);
    const members = visibleTasks.filter((task) => groupId(task) === milestone.id);
    const doneCount = allMembers.filter((task) => task.state === 'DONE').length;
    const blockerCount = allMembers.filter((task) => task.state === 'BLOCKED').length;
    if (collapsed.has(milestone.id)) {
      const position = graph.node(`ms-${milestone.id}`) ?? { x: 24 + index * 48, y: 24 };
      return {
        id: milestone.id,
        type: 'milestone',
        position: { x: position.x - (NODE_W / 2 + MILESTONE_PAD_X), y: position.y - 36 },
        data: {
          kind: 'milestone',
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          collapsed: true,
          doneCount,
          totalCount: allMembers.length,
          blockerCount,
        },
      };
    }
    const memberNodes = members.flatMap((task) => taskNodes.filter((node) => node.id === task.id));
    const xs = memberNodes.map((node) => node.position.x);
    const ys = memberNodes.map((node) => node.position.y);
    const minX = xs.length
      ? Math.min(...xs) - MILESTONE_PAD_X
      : 24 + index * (NODE_W + MILESTONE_GAP_X);
    const minY = ys.length ? Math.min(...ys) - MILESTONE_PAD_TOP : 24;
    const maxX = xs.length
      ? Math.max(...xs.map((x) => x + NODE_W)) + MILESTONE_PAD_X
      : minX + NODE_W + 2 * MILESTONE_PAD_X;
    const maxY = ys.length
      ? Math.max(...ys.map((y) => y + NODE_H)) + MILESTONE_PAD_BOTTOM
      : minY + 72;
    return {
      id: milestone.id,
      type: 'milestone',
      position: { x: minX, y: minY },
      style: { width: maxX - minX, height: maxY - minY },
      data: {
        kind: 'milestone',
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        collapsed: false,
        doneCount,
        totalCount: allMembers.length,
        blockerCount,
      },
    };
  });

  // React Flow child coordinates are relative to the parent container.
  const containerPositions = new Map(containers.map((node) => [node.id, node.position]));
  for (const node of taskNodes) {
    const parentPosition = node.parentId ? containerPositions.get(node.parentId) : undefined;
    if (parentPosition) {
      node.position = {
        x: node.position.x - parentPosition.x,
        y: node.position.y - parentPosition.y,
      };
    }
  }

  // An empty plan is not proof-ready. Completion alone never claims publication.
  const proofPosition = graph.node('proof');
  const completedTaskPlan =
    model.tasks.length > 0 && model.tasks.every((task) => task.state === 'DONE');
  const nodes: RoadmapNode[] = [
    ...containers,
    ...taskNodes,
    {
      id: 'proof',
      type: 'proof',
      position: { x: proofPosition.x - NODE_W / 2, y: proofPosition.y - 36 },
      data: {
        kind: 'proof',
        milestoneId: milestones.at(-1)?.id ?? 'proof',
        doneCount: completedTaskPlan ? 1 : 0,
        totalCount: 1,
        proofState: model.proof,
      },
    },
  ];

  const edges: RoadmapEdge[] = [];
  const edgeIds = new Set<string>();
  for (const task of visibleTasks) {
    for (const prerequisiteId of task.prerequisiteIds) {
      const prerequisite = model.tasks.find((candidate) => candidate.id === prerequisiteId);
      const source = visibleTasks.some((candidate) => candidate.id === prerequisiteId)
        ? prerequisiteId
        : prerequisite && collapsed.has(groupId(prerequisite))
          ? groupId(prerequisite)
          : null;
      if (!source) continue;
      const id = `e-${source}-${task.id}`;
      if (!edgeIds.has(id)) {
        edgeIds.add(id);
        edges.push({ id, source, target: task.id, kind: 'PREREQUISITE' });
      }
    }
  }
  const lastMilestoneId = milestones.at(-1)?.id;
  if (lastMilestoneId) {
    for (const task of visibleTasks.filter((candidate) => groupId(candidate) === lastMilestoneId)) {
      if (dependentsOf(model.tasks, task.id).length === 0) {
        edges.push({
          id: `e-${task.id}-proof`,
          source: task.id,
          target: 'proof',
          kind: 'SEQUENCE',
        });
      }
    }
  }
  return { nodes, edges, pathTaskIds: [...pathTaskIds] };
}
