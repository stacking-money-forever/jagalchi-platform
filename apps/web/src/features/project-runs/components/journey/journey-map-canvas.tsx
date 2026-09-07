'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Crosshair, Maximize2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  computeLayout,
  STATE_LABEL_KO,
  type RoadmapGraphModel,
  type RoadmapTask,
} from '../../projection';

type JourneyTaskNodeData = {
  task: RoadmapTask;
  selected: boolean;
  current: boolean;
  prerequisiteTitles: string[];
  onSelectTask: (taskId: string) => void;
};

function JourneyTaskNode({ data }: NodeProps<Node<JourneyTaskNodeData>>) {
  const { task, selected, current, prerequisiteTitles, onSelectTask } = data;
  const relationship = [
    current ? '현재 작업' : null,
    task.state === 'READY' ? '시작 가능' : null,
    task.state === 'BLOCKED' ? '막힘' : null,
    !task.required ? '선택 작업' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <button
      type="button"
      data-journey-task-id={task.id}
      onClick={() => onSelectTask(task.id)}
      className={cn(
        'nodrag nowheel bg-surface-raised flex h-full w-full flex-col gap-2 rounded-lg border px-3 py-2 text-left shadow-sm',
        selected && 'ring-ring ring-offset-background ring-2 ring-offset-2',
        current && !selected && 'border-primary',
      )}
      aria-pressed={selected}
      aria-label={`${task.title}: ${STATE_LABEL_KO[task.state]}${relationship ? `, ${relationship}` : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!invisible" />
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-semibold">{task.title}</span>
        <Badge variant="outline" className="shrink-0 text-[11px]">
          {STATE_LABEL_KO[task.state]}
        </Badge>
      </span>
      <span className="text-muted-foreground line-clamp-2 text-xs">
        {relationship || '선행 관계 없음'}
        {prerequisiteTitles.length > 0 ? ` · 선행: ${prerequisiteTitles.join(', ')}` : ''}
      </span>
      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </button>
  );
}

function JourneyMilestoneNode({ data }: NodeProps<Node<{ title: string; total: number }>>) {
  return (
    <div className="border-border bg-muted/30 h-full rounded-xl border px-3 py-2">
      <p className="text-sm font-semibold">{data.title}</p>
      <p className="text-muted-foreground text-xs">
        {data.total === 0 ? '작업이 없는 단계' : `작업 ${data.total}개`}
      </p>
    </div>
  );
}

function JourneyProofNode({ data }: NodeProps<Node<{ completed: boolean; taskCount: number }>>) {
  const label =
    data.taskCount === 0
      ? '작업이 없어 발행 준비 아님'
      : data.completed
        ? '작업 완료 — 증명 상태 확인 필요'
        : '작업 완료 후 증명 상태 확인';
  return (
    <div className="border-border bg-surface rounded-lg border px-3 py-2 text-xs">
      <p className="font-semibold">작업 증명</p>
      <p className="text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

const nodeTypes = {
  task: JourneyTaskNode,
  milestone: JourneyMilestoneNode,
  proof: JourneyProofNode,
};

export interface JourneyMapCanvasProps {
  model: RoadmapGraphModel;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  currentTaskId: string | null;
}

/** A read-only, selection-only relationship view for the action-first workspace. */
export function JourneyMapCanvas({
  model,
  selectedTaskId,
  onSelectTask,
  currentTaskId,
}: JourneyMapCanvasProps) {
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const graph = useMemo(() => computeLayout(model, [], []), [model]);
  const titleById = useMemo(
    () => new Map(model.tasks.map((task) => [task.id, task.title])),
    [model.tasks],
  );
  const nodes = useMemo(
    () =>
      graph.nodes.map((node) => {
        if (node.type === 'task' && node.data.task) {
          const task = node.data.task;
          return {
            ...node,
            data: {
              task,
              selected: task.id === selectedTaskId,
              current: task.id === currentTaskId,
              prerequisiteTitles: task.prerequisiteIds
                .map((id) => titleById.get(id))
                .filter((title): title is string => Boolean(title)),
              onSelectTask,
            },
          };
        }
        if (node.type === 'milestone')
          return {
            ...node,
            data: { title: node.data.milestoneTitle ?? '단계', total: node.data.totalCount ?? 0 },
            selectable: false,
          };
        return {
          ...node,
          data: { completed: (node.data.doneCount ?? 0) > 0, taskCount: model.tasks.length },
          selectable: false,
        };
      }),
    [currentTaskId, graph.nodes, model.tasks.length, onSelectTask, selectedTaskId, titleById],
  );
  const edges = useMemo(
    () =>
      graph.edges.map((edge) => ({
        ...edge,
        label: edge.kind === 'PREREQUISITE' ? '선행 작업' : undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: 'var(--border)' },
        labelStyle: { fill: 'var(--muted-foreground)', fontSize: 11 },
      })),
    [graph.edges],
  );
  const fit = useCallback(() => flow?.fitView({ padding: 0.18, duration: 0 }), [flow]);
  const focusCurrent = useCallback(() => {
    if (!flow || !currentTaskId) return;
    const current = nodes.find((node) => node.id === currentTaskId);
    if (current) flow.fitView({ nodes: [current], padding: 1, duration: 0, maxZoom: 1 });
  }, [currentTaskId, flow, nodes]);

  return (
    <section
      className="border-border bg-surface flex min-h-[360px] flex-col rounded-xl border"
      aria-label="프로젝트 여정 지도"
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <div className="mr-auto">
          <h2 className="text-sm font-semibold">프로젝트 여정</h2>
          <p className="text-muted-foreground text-xs">선행 관계를 보고 작업을 선택하세요.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={focusCurrent}
          disabled={!currentTaskId}
        >
          <Crosshair aria-hidden className="size-4" />
          현재 작업
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={fit}>
          <Maximize2 aria-hidden className="size-4" />
          전체 보기
        </Button>
      </div>
      <div className="min-h-[300px] flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={setFlow}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag
          fitView={false}
          minZoom={0.3}
          maxZoom={1.5}
          aria-label="작업 선행 관계 지도"
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
