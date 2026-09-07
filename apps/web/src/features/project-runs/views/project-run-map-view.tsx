'use client';

import { ReactFlowProvider } from '@xyflow/react';

import { RoadmapMapCanvas } from '../components/roadmap/roadmap-map-canvas';

import type { RoadmapGraphModel } from '../projection';

export function ProjectRunMapView({
  model,
  pathTaskIds,
  selectedTaskId,
  onTaskSelect,
  onOpenFocus,
}: {
  model: RoadmapGraphModel;
  pathTaskIds: string[];
  selectedTaskId: string | null;
  onTaskSelect: (taskId: string | null) => void;
  onOpenFocus: (taskId: string) => void;
}) {
  return (
    <div className="h-[min(72vh,820px)] min-h-[420px] w-full">
      <ReactFlowProvider>
        <RoadmapMapCanvas
          model={model}
          pathTaskIds={pathTaskIds}
          selectedTaskId={selectedTaskId}
          onTaskSelect={onTaskSelect}
          onOpenFocus={onOpenFocus}
        />
      </ReactFlowProvider>
    </div>
  );
}
