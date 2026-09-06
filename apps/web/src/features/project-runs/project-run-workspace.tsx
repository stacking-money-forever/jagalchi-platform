'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

import { useProjectRunProjection } from './hooks/use-project-run-projection';
import {
  readProjectRunPresentationState,
  replaceProjectRunTaskUrl,
  writeProjectRunPresentationState,
  type ProjectRunPresentationState,
  type ProjectRunSurface,
} from './presentation-state';
import { ProjectRunFocusView } from './views/project-run-focus-view';
import { ProjectRunLinearView } from './views/project-run-linear-view';
import { ProjectRunMapView } from './views/project-run-map-view';
import { ProjectRunProofView } from './views/project-run-proof-view';

import type { ProjectRunProjection } from '@jagalchi/api-client';

function taskSelection(run: ProjectRunProjection): string | null {
  if (typeof window !== 'undefined') {
    const taskFromUrl = new URLSearchParams(window.location.search).get('task');
    if (taskFromUrl && run.tasks.some((task) => task.id === taskFromUrl)) return taskFromUrl;
  }
  return run.currentTaskId ?? run.recommendedTaskId;
}

export function ProjectRunWorkspace({ run }: { run: ProjectRunProjection }) {
  const { model, pathTaskIds } = useProjectRunProjection(run);
  const planRevision = model.planRevision ?? `${model.runId}:unknown`;
  const storageKey = `${model.runId}:${planRevision}`;
  const defaults = useMemo<ProjectRunPresentationState>(
    () => ({
      surface: run.currentTaskId ? 'focus' : 'map',
      collapsedMilestones: [],
      selectedTaskId: taskSelection(run),
      search: '',
      statusFilter: 'ALL',
    }),
    [run],
  );
  const [presentation, setPresentation] = useState(defaults);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPresentation(readProjectRunPresentationState(model.runId, planRevision, defaults));
      setLoadedStorageKey(storageKey);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [defaults, model.runId, planRevision, storageKey]);

  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    const stored = readProjectRunPresentationState(model.runId, planRevision, presentation);
    writeProjectRunPresentationState(model.runId, planRevision, {
      ...stored,
      surface: presentation.surface,
      selectedTaskId: presentation.selectedTaskId,
    });
  }, [loadedStorageKey, model.runId, planRevision, presentation, storageKey]);

  const selectTask = useCallback((taskId: string | null) => {
    setPresentation((previous) => ({ ...previous, selectedTaskId: taskId }));
    replaceProjectRunTaskUrl(taskId);
  }, []);
  const openFocus = useCallback(
    (taskId: string) => {
      selectTask(taskId);
      setPresentation((previous) => ({ ...previous, surface: 'focus' }));
    },
    [selectTask],
  );
  const setSurface = useCallback((surface: ProjectRunSurface) => {
    setPresentation((previous) => ({ ...previous, surface }));
  }, []);

  const selectedTaskId =
    presentation.selectedTaskId &&
    model.tasks.some((task) => task.id === presentation.selectedTaskId)
      ? presentation.selectedTaskId
      : (model.currentTaskId ?? model.recommendedTaskId);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        className="border-border flex w-fit overflow-hidden rounded-lg border"
        role="tablist"
        aria-label="실행 화면"
      >
        {(
          [
            ['map', '지도'],
            ['linear', '선형'],
            ['focus', '포커스'],
            ['proof', 'Proof'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={presentation.surface === id}
            className={cn(
              'px-4 py-2 text-sm font-bold',
              presentation.surface === id ? 'bg-primary text-primary-foreground' : 'bg-surface',
            )}
            onClick={() => setSurface(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="min-h-0 flex-1">
        {presentation.surface === 'map' ? (
          <ProjectRunMapView
            key={`${model.runId}:${planRevision}`}
            model={model}
            pathTaskIds={pathTaskIds}
            selectedTaskId={selectedTaskId}
            onTaskSelect={selectTask}
            onOpenFocus={openFocus}
          />
        ) : null}
        {presentation.surface === 'linear' ? (
          <ProjectRunLinearView
            model={model}
            pathTaskIds={pathTaskIds}
            selectedTaskId={selectedTaskId}
            onTaskSelect={selectTask}
            onOpenFocus={openFocus}
          />
        ) : null}
        {presentation.surface === 'focus' ? (
          <ProjectRunFocusView
            run={run}
            model={model}
            selectedTaskId={selectedTaskId}
            onTaskSelect={selectTask}
          />
        ) : null}
        {presentation.surface === 'proof' ? <ProjectRunProofView run={run} /> : null}
      </div>
    </div>
  );
}
