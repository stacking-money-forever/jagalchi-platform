'use client';

import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { ProjectRunProjection } from '@jagalchi/api-client';

export default function ProjectRunFlow({ run }: { run: ProjectRunProjection }) {
  const nodes: Node[] = run.map.nodes.map((mapNode, index) => ({
    id: mapNode.id,
    position: { x: (index % 3) * 260, y: Math.floor(index / 3) * 140 },
    data: { label: `${mapNode.title} · ${mapNode.state}` },
  }));
  const edges: Edge[] = run.map.edges.map((mapEdge) => ({
    id: mapEdge.id,
    source: mapEdge.source,
    target: mapEdge.target,
    label: mapEdge.kind === 'PREREQUISITE' ? '선행' : undefined,
    animated: mapEdge.kind === 'SEQUENCE',
  }));
  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border" aria-label="프로젝트 작업 흐름">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
