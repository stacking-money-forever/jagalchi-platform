'use client';

import { useCallback, useState } from 'react';

import { JourneyList } from './components/journey/journey-list';
import { JourneyMapCanvas } from './components/journey/journey-map-canvas';
import { useProjectRunProjection } from './hooks/use-project-run-projection';
import { ProjectRunFocusView } from './views/project-run-focus-view';
import { ProjectRunProofView } from './views/project-run-proof-view';

import type { ProjectRunProjection } from '@jagalchi/api-client';

function initialTaskId(run: ProjectRunProjection): string | null {
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('task');
    if (fromUrl && run.tasks.some((task) => task.id === fromUrl)) return fromUrl;
  }
  return run.currentTaskId ?? run.recommendedTaskId;
}

/** A single task document with synchronized, non-mutating journey navigation. */
export function ProjectRunWorkspace({ run }: { run: ProjectRunProjection }) {
  const { model } = useProjectRunProjection(run);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => initialTaskId(run));
  const [mapOpen, setMapOpen] = useState(false);

  const selectTask = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
    const url = new URL(window.location.href);
    if (taskId) url.searchParams.set('task', taskId);
    else url.searchParams.delete('task');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const effectiveSelectedTaskId =
    selectedTaskId && run.tasks.some((task) => task.id === selectedTaskId)
      ? selectedTaskId
      : initialTaskId(run);

  const journeyProps = {
    model,
    selectedTaskId: effectiveSelectedTaskId,
    onSelectTask: (taskId: string) => selectTask(taskId),
    currentTaskId: run.currentTaskId,
  };

  return (
    <div className="journey-workspace min-w-0 space-y-6">
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(36rem,1.25fr)_minmax(22rem,0.75fr)]">
        <ProjectRunFocusView
          run={run}
          model={model}
          selectedTaskId={effectiveSelectedTaskId}
          onTaskSelect={selectTask}
        />
        <aside
          className="border-border bg-surface rounded-2xl border p-4"
          aria-label="프로젝트 여정"
        >
          <JourneyList {...journeyProps} />
          <div className="border-border mt-5 border-t pt-4">
            <button
              type="button"
              className="text-primary min-h-11 text-sm font-bold underline underline-offset-4"
              aria-expanded={mapOpen}
              onClick={() => setMapOpen((open) => !open)}
            >
              {mapOpen ? '여정 지도 닫기' : '여정 지도 펼치기'}
            </button>
            {mapOpen ? (
              <div className="mt-3 xl:hidden">
                <JourneyMapCanvas {...journeyProps} />
              </div>
            ) : null}
          </div>
          <div className="mt-5 hidden xl:block">
            <JourneyMapCanvas {...journeyProps} />
          </div>
        </aside>
      </div>
      <details className="border-border bg-surface rounded-2xl border p-4 sm:p-5">
        <summary className="text-primary min-h-11 cursor-pointer py-2 text-sm font-bold underline underline-offset-4">
          실행 증명과 발행 보기
        </summary>
        <div className="border-border mt-4 border-t pt-5">
          <ProjectRunProofView run={run} />
        </div>
      </details>
    </div>
  );
}
