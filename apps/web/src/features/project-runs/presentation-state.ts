import type { TaskState } from './projection';

export type ProjectRunSurface = 'map' | 'linear' | 'focus' | 'proof';

export type ProjectRunPresentationState = {
  surface: ProjectRunSurface;
  collapsedMilestones: string[];
  selectedTaskId: string | null;
  search: string;
  statusFilter: 'ALL' | TaskState;
  viewport?: { x: number; y: number; zoom: number };
};

const SURFACES: Record<ProjectRunSurface, true> = {
  map: true,
  linear: true,
  focus: true,
  proof: true,
};
const TASK_STATES: Record<TaskState, true> = {
  LOCKED: true,
  READY: true,
  IN_PROGRESS: true,
  BLOCKED: true,
  DEFERRED: true,
  VERIFYING: true,
  DONE: true,
};

function isKnownSurface(value: unknown): value is ProjectRunSurface {
  return typeof value === 'string' && SURFACES[value as ProjectRunSurface] === true;
}

function isKnownTaskState(value: unknown): value is TaskState {
  return typeof value === 'string' && TASK_STATES[value as TaskState] === true;
}

function isViewport(value: unknown): value is ProjectRunPresentationState['viewport'] {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.zoom === 'number'
  );
}

export function projectRunPresentationKey(runId: string, planRevision: string): string {
  return `jagalchi:project-run:${runId}:${planRevision}`;
}

export function readProjectRunPresentationState(
  runId: string,
  planRevision: string,
  defaults: ProjectRunPresentationState,
): ProjectRunPresentationState {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(projectRunPresentationKey(runId, planRevision));
    const stored = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
    const storedViewport = stored?.viewport;
    const params = new URLSearchParams(window.location.search);
    const taskFromUrl = params.get('task');
    return {
      ...defaults,
      surface: isKnownSurface(stored?.surface) ? stored.surface : defaults.surface,
      collapsedMilestones: Array.isArray(stored?.collapsedMilestones)
        ? stored.collapsedMilestones.filter((id): id is string => typeof id === 'string')
        : defaults.collapsedMilestones,
      selectedTaskId:
        taskFromUrl ??
        (typeof stored?.selectedTaskId === 'string'
          ? stored.selectedTaskId
          : defaults.selectedTaskId),
      search: typeof stored?.search === 'string' ? stored.search : defaults.search,
      statusFilter:
        stored?.statusFilter === 'ALL'
          ? 'ALL'
          : isKnownTaskState(stored?.statusFilter)
            ? stored.statusFilter
            : defaults.statusFilter,
      viewport: isViewport(storedViewport) ? storedViewport : defaults.viewport,
    };
  } catch {
    return defaults;
  }
}

export function writeProjectRunPresentationState(
  runId: string,
  planRevision: string,
  state: ProjectRunPresentationState,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      projectRunPresentationKey(runId, planRevision),
      JSON.stringify(state),
    );
  } catch {
    // Private browsing and quota failures must not block the roadmap.
  }
}

export function replaceProjectRunTaskUrl(taskId: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (taskId) url.searchParams.set('task', taskId);
  else url.searchParams.delete('task');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function projectRunTaskHref(runId: string, taskId: string): string {
  return `/projects/${encodeURIComponent(runId)}?task=${encodeURIComponent(taskId)}#task-${encodeURIComponent(taskId)}`;
}
