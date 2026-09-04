import type {
  RoadmapGraphModel,
  RoadmapMilestone,
  RoadmapProofState,
  RoadmapTask,
  TaskState,
} from './types';
import type { ProjectRunProjection } from '@jagalchi/api-client';

function deriveMilestones(projection: ProjectRunProjection): RoadmapMilestone[] {
  const seen = new Set<string>();
  const milestones: RoadmapMilestone[] = [];
  let index = 0;

  const orderedMilestoneIds: string[] = [];
  for (const node of projection.map.nodes) {
    if (node.milestoneId) orderedMilestoneIds.push(node.milestoneId);
  }
  for (const task of projection.tasks) {
    if (task.milestoneId) orderedMilestoneIds.push(task.milestoneId);
  }

  for (const id of orderedMilestoneIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    index += 1;
    milestones.push({ id, title: `단계 ${index}` });
  }

  return milestones;
}

function citationLabelsForTask(
  citationIds: readonly string[] | undefined,
  projection: ProjectRunProjection,
): string[] {
  if (!citationIds?.length || !projection.citations?.length) return [];
  const byId = new Map(projection.citations.map((c) => [c.id, c.label]));
  return citationIds.map((id) => byId.get(id)).filter((label): label is string => Boolean(label));
}

function gapLabelsForTask(
  gapIds: readonly string[] | undefined,
  projection: ProjectRunProjection,
): string[] {
  if (!gapIds?.length || !projection.gaps?.length) return [];
  const byId = new Map(projection.gaps.map((g) => [g.id, g.description]));
  return gapIds.map((id) => byId.get(id)).filter((label): label is string => Boolean(label));
}

function evidenceCountForTask(
  task: ProjectRunProjection['tasks'][number],
  projection: ProjectRunProjection,
): number {
  const evaluations = projection.proof?.facts?.evaluations ?? [];
  if (evaluations.length === 0) return 0;
  const passedRules = new Set(evaluations.filter((e) => e.passed).map((e) => e.ruleId));
  return task.evidenceRequirements.filter((_, index) => passedRules.has(`rule-${index}`)).length;
}

function adaptTask(
  task: ProjectRunProjection['tasks'][number],
  projection: ProjectRunProjection,
): RoadmapTask | null {
  if (!task.milestoneId) return null;
  const blockedReason =
    task.verificationFailure?.note?.trim() || task.verificationFailure?.code || undefined;

  return {
    id: task.id,
    title: task.title,
    state: task.state as TaskState,
    required: task.required,
    milestoneId: task.milestoneId,
    prerequisiteIds: [...task.prerequisiteIds],
    purpose: task.purpose,
    acceptanceCriteria: [...task.acceptanceCriteria],
    evidenceRequirements: [...task.evidenceRequirements],
    evidenceCount: evidenceCountForTask(task, projection),
    outcome: task.acceptanceCriteria[0] ?? '',
    blockedReason,
    citationLabels: citationLabelsForTask(task.citationIds, projection),
    gapLabels: gapLabelsForTask(task.gapIds, projection),
  };
}

function adaptProof(projection: ProjectRunProjection): RoadmapProofState | null {
  if (!projection.proof) return null;
  return {
    verification: projection.proof.verification.state,
    publication: projection.proof.publication.state,
  };
}

export function adaptProjectRunProjection(projection: ProjectRunProjection): RoadmapGraphModel {
  const milestones = deriveMilestones(projection);
  const tasks = projection.tasks
    .map((task) => adaptTask(task, projection))
    .filter((task): task is RoadmapTask => task !== null);

  return {
    runId: projection.id,
    runState: projection.state,
    currentTaskId: projection.currentTaskId,
    recommendedTaskId: projection.recommendedTaskId,
    milestones,
    tasks,
    proof: adaptProof(projection),
  };
}
