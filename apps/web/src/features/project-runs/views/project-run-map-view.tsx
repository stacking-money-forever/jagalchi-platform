'use client';

import { ReactFlowProvider } from '@xyflow/react';

import { RoadmapMapCanvas } from '../components/roadmap/roadmap-map-canvas';

import type { RoadmapGraphModel } from '../projection';

export function ProjectRunMapView({
  model,
  pathTaskIds,
}: {
  model: RoadmapGraphModel;
  pathTaskIds: string[];
}) {
  return (
    <div className="h-[min(72vh,820px)] min-h-[480px] w-full">
      <ReactFlowProvider>
        <RoadmapMapCanvas model={model} pathTaskIds={pathTaskIds} />
      </ReactFlowProvider>
    </div>
  );
}
