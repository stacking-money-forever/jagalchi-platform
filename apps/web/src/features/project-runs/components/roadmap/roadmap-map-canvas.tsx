'use client';

/**
 * Map desktop exemplar — 1440px canvas + detail rail.
 *
 * Design exemplar only. Lives outside production routes and mirrors
 * ProjectRunProjectionDto so the approved preset transfers into Phase 2.2.
 * No Toss or React Flow Pro assets/code: shadcn/ui primitives, Jagalchi
 * semantic tokens, @xyflow/react 12, @dagrejs/dagre.
 *
 * Demonstrates (UI_REFERENCE_PACK Implementation gate):
 * - current-path highlight (ancestors -> anchor -> forward route -> Proof)
 * - milestone collapse (click header, keyboard Enter/Space, aria-expanded)
 * - semantic zoom tiers (overview / task / evidence) via viewport zoom
 * - selected-task detail rail (click or keyboard focus + Enter)
 * - non-color status cues: text label + icon + border/structure per state
 * - required/optional differentiated by label AND badge, not color alone
 * - fitView, zoom controls, search, filter, linear view reachable by keyboard
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  GitBranch,
  Search,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import {
  computeLayout,
  STATE_LABEL_KO,
  type RoadmapGraphModel,
  type RoadmapNodeData,
  type RoadmapTask,
  type TaskState,
  type ZoomTier,
} from '../../projection';

import { Clock, STATE_CLASS, STATE_ICON, StatusChip } from './status-presentation';

// ---------------------------------------------------------------------------
// Zoom tiers
// ---------------------------------------------------------------------------

const ZOOM_TIER_THRESHOLD = 0.55;
const EVIDENCE_TIER_MIN_ZOOM = 1.15;

function zoomTierFrom(vp: { zoom: number }): ZoomTier {
  if (vp.zoom < ZOOM_TIER_THRESHOLD) return 'overview';
  if (vp.zoom >= EVIDENCE_TIER_MIN_ZOOM) return 'evidence';
  return 'task';
}

function tierLabelKo(tier: ZoomTier): string {
  if (tier === 'overview') return '전체';
  if (tier === 'evidence') return '증거';
  return '작업';
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

function MilestoneNode({ data }: NodeProps<Node<RoadmapNodeData>>) {
  const {
    milestoneId,
    milestoneTitle,
    doneCount = 0,
    totalCount = 0,
    blockerCount = 0,
    collapsed = false,
    zoomTier = 'task',
  } = data;
  const compact = zoomTier !== 'overview';
  return (
    <div className={cn('bg-surface-raised rounded-lg border-2 shadow-sm', 'border-border')}>
      <Handle type="target" position={Position.Top} className="!invisible" />
      <button
        type="button"
        data-exemplar-collapse={milestoneId}
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? `${milestoneTitle} 펼치기 (${doneCount}/${totalCount} 완료)`
            : `${milestoneTitle} 접기 (${doneCount}/${totalCount} 완료)`
        }
        className={cn('flex w-full items-center gap-2 px-4 text-left', compact ? 'h-10' : 'h-12')}
      >
        {collapsed ? (
          <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronDown aria-hidden className="text-muted-foreground size-4 shrink-0" />
        )}
        <span className={cn('truncate font-bold', compact ? 'text-xs' : 'text-sm')}>
          {milestoneTitle}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {!compact && blockerCount > 0 ? (
            <span className="bg-warning-subtle text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
              <AlertTriangle aria-hidden className="size-3" />
              막힘 {blockerCount}
            </span>
          ) : null}
          <span className="text-muted-foreground text-xs font-bold">
            {doneCount}/{totalCount}
          </span>
        </span>
      </button>
      {!collapsed && !compact ? (
        <div className="bg-primary-subtle h-1 w-full rounded-b-lg" aria-hidden>
          <div
            className="bg-success h-full rounded-bl-lg"
            style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </div>
  );
}

function ProofNode({ data }: NodeProps<Node<RoadmapNodeData>>) {
  const proofOk = (data.doneCount ?? 0) > 0;
  const zoomTier = data.zoomTier ?? 'task';
  const proofState = data.proofState;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border-2 px-4 shadow-sm',
        proofOk ? 'border-success bg-success-subtle' : 'border-border bg-surface-raised',
        zoomTier === 'overview' ? 'h-12' : 'h-14',
      )}
    >
      <GitBranch aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">Proof 발행</p>
        {zoomTier === 'overview' ? (
          <p className="text-muted-foreground truncate text-[11px]">
            {proofOk ? '발행 가능' : '대기'}
          </p>
        ) : zoomTier === 'evidence' && proofState ? (
          <p className="text-muted-foreground truncate text-[11px]">
            검증 {proofState.verification} · 발행 {proofState.publication}
          </p>
        ) : (
          <p className="text-muted-foreground truncate text-[11px]">증거 스냅샷 · 기계 검증</p>
        )}
      </div>
      <span
        className={cn(
          'ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold',
          proofOk
            ? 'border-success bg-success text-success-foreground'
            : 'border-border bg-muted text-muted-foreground',
        )}
      >
        <CircleDashed aria-hidden className="size-3" />
        {proofOk ? '준비' : '대기'}
      </span>
    </div>
  );
}

function TaskNode({ data, selected }: NodeProps<Node<RoadmapNodeData>>) {
  const task = data.task as RoadmapTask;
  const onPath = data.onPath === true;
  const zoomTier = data.zoomTier ?? 'task';
  const shellClass = cn(
    'group relative flex h-full w-full flex-col justify-between rounded-lg border-2 px-3 py-2 text-left shadow-sm transition-shadow',
    STATE_CLASS[task.state],
    selected && 'ring-ring/50 ring-offset-background ring-3 ring-offset-1',
    onPath && !selected && 'ring-ring/40 ring-2',
  );

  if (zoomTier === 'overview') {
    return (
      <div className={shellClass} data-zoom-tier="overview">
        <Handle type="target" position={Position.Top} className="!invisible" />
        <div className="flex items-center gap-2">
          {STATE_ICON[task.state]}
          <p className="min-w-0 flex-1 truncate text-[11px] font-bold" title={task.title}>
            {task.title}
          </p>
        </div>
        <Handle type="source" position={Position.Bottom} className="!invisible" />
      </div>
    );
  }

  if (zoomTier === 'evidence') {
    return (
      <div className={shellClass} data-zoom-tier="evidence">
        <Handle type="target" position={Position.Top} className="!invisible" />
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 min-w-0 text-xs font-bold" title={task.title}>
            {task.title}
          </p>
          <StatusChip state={task.state} />
        </div>
        <p className="text-muted-foreground line-clamp-2 text-[10px] leading-3">
          {task.acceptanceCriteria[0]}
        </p>
        <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold">
          <Clock aria-hidden className="size-3" />
          증거 {task.evidenceCount}건{task.state === 'VERIFYING' ? ' · 검증 중' : ''}
        </p>
        <Handle type="source" position={Position.Bottom} className="!invisible" />
      </div>
    );
  }

  return (
    <div className={shellClass} data-zoom-tier="task">
      <Handle type="target" position={Position.Top} className="!invisible" />
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 min-w-0 text-xs leading-4 font-bold" title={task.title}>
          {task.title}
        </p>
        <StatusChip state={task.state} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded border px-1 py-px text-[10px] font-bold',
            task.required
              ? 'border-border bg-background/60 text-muted-foreground'
              : 'border-muted-foreground/60 text-muted-foreground border-dashed',
          )}
        >
          {task.required ? '필수' : '선택'}
        </span>
        <span className="text-muted-foreground truncate text-[10px]">{task.outcome}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </div>
  );
}

const nodeTypes = { milestone: MilestoneNode, task: TaskNode, proof: ProofNode };

// ---------------------------------------------------------------------------
// Edge: dependency direction is structural (arrow + path into target top).
// Path edges get a stronger stroke + label; the rest stay quiet.
// ---------------------------------------------------------------------------

function RoadmapEdgeComponent({ sourceX, sourceY, targetX, targetY, data }: EdgeProps<Edge>) {
  const onPath = (data as { onPath?: boolean } | undefined)?.onPath === true;
  return (
    <>
      <path
        d={`M ${sourceX},${sourceY} C ${sourceX},${sourceY + 32} ${targetX},${targetY - 32} ${targetX},${targetY}`}
        fill="none"
        strokeWidth={onPath ? 2.5 : 1.5}
        stroke={onPath ? 'var(--foreground)' : 'var(--border)'}
        strokeDasharray={onPath ? undefined : '5 4'}
        markerEnd={onPath ? 'url(#roadmap-arrow-path)' : 'url(#roadmap-arrow)'}
      />
      <defs>
        <marker id="roadmap-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--border)" strokeWidth="1.2" />
        </marker>
        <marker
          id="roadmap-arrow-path"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--foreground)" strokeWidth="1.4" />
        </marker>
      </defs>
    </>
  );
}

const edgeTypes = { roadmap: RoadmapEdgeComponent };

function DetailRail({ task, onClose }: { task: RoadmapTask | null; onClose: () => void }) {
  if (!task) {
    return (
      <aside
        className="border-border bg-surface hidden w-80 shrink-0 border-l p-4 lg:block"
        aria-label="작업 상세"
        data-exemplar-detail-rail
      >
        <p className="text-sm font-bold">작업 상세</p>
        <p className="text-muted-foreground mt-2 text-xs leading-5">
          지도에서 작업을 선택하면 목적, 요구 역량, 수용 기준, 증거 현황이 여기에 표시됩니다.
        </p>
      </aside>
    );
  }
  return (
    <aside
      className="border-border bg-surface flex w-80 shrink-0 flex-col border-l"
      aria-label={`작업 상세: ${task.title}`}
      data-exemplar-detail-rail
    >
      <div className="border-border flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusChip state={task.state} />
            <span
              className={cn(
                'inline-flex items-center rounded border px-1 py-px text-[10px] font-bold',
                task.required
                  ? 'border-border text-muted-foreground'
                  : 'border-muted-foreground/60 text-muted-foreground border-dashed',
              )}
            >
              {task.required ? '필수' : '선택'}
            </span>
          </div>
          <h3 className="mt-2 text-sm leading-5 font-bold">{task.title}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="상세 닫기"
          className="shrink-0"
        >
          <X aria-hidden className="size-4" />
        </Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs leading-5">
        <section>
          <p className="text-foreground font-bold">목적</p>
          <p className="text-muted-foreground mt-1">{task.purpose}</p>
        </section>
        <section>
          <p className="text-foreground font-bold">근거</p>
          <ul className="mt-1 space-y-1">
            {task.citationLabels.map((label: string) => (
              <li key={`citation-${label}`} className="flex gap-1.5">
                <span className="text-muted-foreground font-bold" aria-hidden>
                  ·
                </span>
                <span className="text-muted-foreground">{label}</span>
              </li>
            ))}
            {task.gapLabels.map((label: string) => (
              <li key={`gap-${label}`} className="flex gap-1.5">
                <span className="text-muted-foreground font-bold" aria-hidden>
                  ·
                </span>
                <span className="text-muted-foreground">{label}</span>
              </li>
            ))}
            {task.citationLabels.length === 0 && task.gapLabels.length === 0 ? (
              <li className="text-muted-foreground">연결된 인용·갭이 없습니다.</li>
            ) : null}
          </ul>
        </section>
        <section>
          <p className="text-foreground font-bold">수용 기준</p>
          <ul className="mt-1 space-y-1">
            {task.acceptanceCriteria.map((c: string) => (
              <li key={c} className="flex gap-1.5">
                <Check aria-hidden className="text-success mt-0.5 size-3 shrink-0" />
                <span className="text-muted-foreground">{c}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="text-foreground font-bold">증거 현황</p>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            <Clock aria-hidden className="size-3" />
            증거 {task.evidenceCount}건{task.state === 'VERIFYING' ? ' · 검증 진행 중' : ''}
          </p>
          {task.state === 'BLOCKED' && task.blockedReason ? (
            <p className="border-warning bg-warning-subtle text-foreground mt-2 flex items-start gap-1.5 rounded border p-2">
              <AlertTriangle aria-hidden className="mt-0.5 size-3 shrink-0" />
              {task.blockedReason}
            </p>
          ) : null}
        </section>
      </div>
      <div className="border-border border-t p-4">
        <Button className="w-full" aria-label={`현재 작업 열기: ${task.title}`}>
          현재 작업 열기
        </Button>
      </div>
    </aside>
  );
}

export function RoadmapMapCanvas({
  model,
  pathTaskIds,
}: {
  model: RoadmapGraphModel;
  pathTaskIds: string[];
}) {
  const [collapsedMilestones, setCollapsedMilestones] = useState<readonly string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    model.currentTaskId ?? model.recommendedTaskId,
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskState>('ALL');
  const [zoomTier, setZoomTier] = useState<ZoomTier>('overview');
  const { fitView, setViewport, getViewport } = useReactFlow();

  const graph = useMemo(
    () => computeLayout(model, pathTaskIds, collapsedMilestones),
    [model, pathTaskIds, collapsedMilestones],
  );

  const { nodes: rfNodes, edges: rfEdges } = useMemo(() => {
    const pathSet: Record<string, boolean> = {};
    for (const id of pathTaskIds) pathSet[id] = true;
    const nodes = graph.nodes.map((n) => ({
      ...n,
      draggable: false,
      selectable: n.type === 'task' || n.type === 'milestone',
      data: {
        ...n.data,
        zoomTier,
        ...(n.type === 'proof' ? { proofState: model.proof } : {}),
        ...(n.type === 'task' ? { onPath: pathSet[n.id] === true } : {}),
      },
    }));
    const edges = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'roadmap' as const,
      data: { onPath: pathSet[e.source] === true && pathSet[e.target] === true },
    }));
    return { nodes, edges };
  }, [graph, pathTaskIds, zoomTier, model.proof]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(rfNodes);
  const [edges, , onEdgesChange] = useEdgesState<Edge>(rfEdges);

  useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes, setNodes]);

  const onViewportChange = useCallback((vp: { zoom: number }) => {
    setZoomTier(zoomTierFrom(vp));
  }, []);

  const onInit = useCallback(() => {
    setZoomTier(zoomTierFrom(getViewport()));
  }, [getViewport]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'task') {
      setSelectedTaskId(node.id);
    } else if (node.type === 'milestone') {
      setCollapsedMilestones((prev) =>
        prev.includes(node.id) ? prev.filter((id) => id !== node.id) : [...prev, node.id],
      );
    }
  }, []);

  const selectedTask = useMemo(
    () => model.tasks.find((t) => t.id === selectedTaskId) ?? null,
    [model, selectedTaskId],
  );

  const filteredTasks = useMemo(() => {
    const q = search.trim();
    return model.tasks.filter((t) => {
      const okState = statusFilter === 'ALL' || t.state === statusFilter;
      const okSearch = q.length === 0 || t.title.includes(q);
      return okState && okSearch;
    });
  }, [model, search, statusFilter]);

  const focusCurrentTask = useCallback(() => {
    const anchorId = model.currentTaskId ?? model.recommendedTaskId;
    if (!anchorId) return;
    const node = nodes.find((n) => n.id === anchorId);
    if (node) {
      setViewport({ x: -node.position.x + 480, y: -node.position.y + 240, zoom: 0.9 });
    }
  }, [model, nodes, setViewport]);

  const tierLabel = tierLabelKo(zoomTier);
  const motionSafe =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-border bg-surface flex flex-wrap items-center gap-2 border-b p-3">
          <h2 className="mr-2 text-sm font-bold">실행 로드맵 지도</h2>
          <div className="relative">
            <Search
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="작업 검색"
              aria-label="작업 검색"
              className="h-8 w-40 pl-7 text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | TaskState)}
            aria-label="상태 필터"
            className="border-border bg-surface h-8 rounded-md border px-2 text-xs font-bold"
          >
            <option value="ALL">전체 상태</option>
            {(Object.keys(STATE_LABEL_KO) as TaskState[]).map((s) => (
              <option key={s} value={s}>
                {STATE_LABEL_KO[s]}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={focusCurrentTask}>
            현재 작업
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => fitView({ duration: motionSafe ? 0 : 200 })}
          >
            전체 보기
          </Button>
          <span className="text-muted-foreground ml-auto text-[11px]" aria-live="polite">
            확대 단계: {tierLabel}
          </span>
        </div>

        <div
          className="relative min-h-0 flex-1"
          data-exemplar-canvas
          data-exemplar-zoom-tier={zoomTier}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            minZoom={0.2}
            maxZoom={1.75}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onMove={(_, vp) => onViewportChange(vp)}
            onMoveEnd={(_, vp) => onViewportChange(vp)}
            onInit={onInit}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            aria-label="실행 로드맵 지도: 방향키로 이동, Enter로 선택"
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>

          <div className="pointer-events-none absolute top-3 left-3 z-10">
            <Badge variant="subtle" intent="neutral">
              단계: {tierLabel}
            </Badge>
          </div>

          {search.trim().length > 0 || statusFilter !== 'ALL' ? (
            <div className="pointer-events-none absolute bottom-3 left-3 z-10">
              <Badge variant="subtle" intent="neutral">
                표시 {filteredTasks.length} / {model.tasks.length}
              </Badge>
            </div>
          ) : null}
        </div>
      </div>

      <DetailRail task={selectedTask} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
