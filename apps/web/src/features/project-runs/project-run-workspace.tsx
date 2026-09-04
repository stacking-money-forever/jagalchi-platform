'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

import { useProjectRunProjection } from './hooks/use-project-run-projection';
import { ProjectRunFocusView } from './views/project-run-focus-view';
import { ProjectRunMapView } from './views/project-run-map-view';
import { ProjectRunProofView } from './views/project-run-proof-view';

import type { ProjectRunProjectionEnvelope } from './projection/projection-contract';

type Surface = 'map' | 'focus' | 'proof';

export function ProjectRunWorkspace({ run }: { run: ProjectRunProjectionEnvelope }) {
  const [surface, setSurface] = useState<Surface>('map');
  const { model, pathTaskIds } = useProjectRunProjection(run);

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
            ['focus', '포커스'],
            ['proof', 'Proof'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={surface === id}
            className={cn(
              'px-4 py-2 text-sm font-bold',
              surface === id ? 'bg-primary text-primary-foreground' : 'bg-surface',
            )}
            onClick={() => setSurface(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="min-h-0 flex-1">
        {surface === 'map' ? <ProjectRunMapView model={model} pathTaskIds={pathTaskIds} /> : null}
        {surface === 'focus' ? <ProjectRunFocusView run={run} model={model} /> : null}
        {surface === 'proof' ? <ProjectRunProofView run={run} /> : null}
      </div>
    </div>
  );
}
