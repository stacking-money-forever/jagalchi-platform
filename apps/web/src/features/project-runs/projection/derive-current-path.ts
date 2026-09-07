import type { RoadmapGraphModel, RoadmapTask } from './types';

function ancestorsOf(tasks: RoadmapTask[], anchorId: string): string[] {
  const byId: Record<string, RoadmapTask> = {};
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

export function deriveCurrentPath(model: RoadmapGraphModel): string[] {
  const anchorId = model.currentTaskId ?? model.recommendedTaskId;
  if (!anchorId) return [];
  const anchor = model.tasks.find((t) => t.id === anchorId);
  if (!anchor) return [];

  const path = new Set<string>();
  path.add(anchorId);

  for (const id of ancestorsOf(model.tasks, anchorId)) path.add(id);

  const anchorMilestone = anchor.milestoneId;
  const forwardInMilestone = dependentsOf(model.tasks, anchorId).filter((id) => {
    const t = model.tasks.find((x) => x.id === id);
    return (
      t !== undefined &&
      t.milestoneId === anchorMilestone &&
      t.state !== 'BLOCKED' &&
      t.state !== 'DEFERRED'
    );
  });
  for (const id of forwardInMilestone) path.add(id);

  const routeRelevant: Record<string, boolean> = {};
  const isRouteRelevant = (id: string): boolean => {
    if (routeRelevant[id] !== undefined) return routeRelevant[id];
    routeRelevant[id] = false;
    const t = model.tasks.find((x) => x.id === id);
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
        const pt = model.tasks.find((x) => x.id === p);
        return pt?.state === 'DONE' || path.has(p) || isRouteRelevant(p);
      });
    routeRelevant[id] = reachable;
    return reachable;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const t of model.tasks) {
      if (path.has(t.id)) continue;
      if (t.milestoneId === anchorMilestone) continue;
      if (t.state === 'BLOCKED' || t.state === 'DEFERRED') continue;
      if (t.state === 'LOCKED' && !t.required) continue;
      const satisfied = t.prerequisiteIds.every((p) => {
        const pt = model.tasks.find((x) => x.id === p);
        return pt?.state === 'DONE' || path.has(p) || isRouteRelevant(p);
      });
      if (t.prerequisiteIds.length > 0 && satisfied) {
        path.add(t.id);
        changed = true;
      }
    }
  }
  return [...path].filter((id) => model.tasks.some((t) => t.id === id));
}
