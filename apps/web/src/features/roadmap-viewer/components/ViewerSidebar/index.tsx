'use client';

import { useCallback, useMemo, useState } from 'react';

import { useAtom, useAtomValue } from 'jotai';
import { CheckCircle2, Circle, Search, X } from 'lucide-react';

import { VIEWER_MESSAGES } from '@/constants/messages';
import { useCompleteNode, useRoadmapProgress } from '@/hooks/use-roadmap-progress';
import { capture } from '@/lib/analytics/client';
import { isAuthenticatedAtom } from '@/lib/auth-atoms';
import { sanitizeUrl } from '@/lib/url-validation';
import type { JagalchiNodeData } from '@/types/roadmap.types';

import {
  selectedViewerNodeAtom,
  selectedViewerNodeIdAtom,
  viewerNodesAtom,
} from '../../stores/viewer-atoms';

interface ViewerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  roadmapId?: string;
}

export function ViewerSidebar({ isOpen = true, onClose, roadmapId }: ViewerSidebarProps) {
  const nodes = useAtomValue(viewerNodesAtom);
  const selectedNode = useAtomValue(selectedViewerNodeAtom);
  const [selectedNodeId, setSelectedNodeId] = useAtom(selectedViewerNodeIdAtom);
  const [searchQuery, setSearchQuery] = useState('');
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const { data: progress } = useRoadmapProgress(roadmapId ?? '');
  const completeMutation = useCompleteNode(roadmapId ?? '');

  const completedIds = useMemo(
    () => new Set((progress?.completedNodeIds ?? []).map(String)),
    [progress?.completedNodeIds],
  );

  const nodeItems = useMemo(() => nodes.filter((n) => n.type === 'jagalchi-node'), [nodes]);

  const filteredNodes = useMemo(
    () =>
      searchQuery
        ? nodeItems.filter((n) => {
            const data = n.data as JagalchiNodeData;
            return data.label.toLowerCase().includes(searchQuery.toLowerCase());
          })
        : nodeItems,
    [nodeItems, searchQuery],
  );

  const handleToggleComplete = useCallback(
    (nodeId: string) => {
      if (!roadmapId || !isAuthenticated) return;
      const isCompleted = !completedIds.has(nodeId);
      completeMutation.mutate(
        { nodeId, isCompleted },
        {
          onSuccess: () =>
            capture('learning_node_completion_changed', {
              action: isCompleted ? 'completed' : 'uncompleted',
            }),
        },
      );
    },
    [roadmapId, isAuthenticated, completedIds, completeMutation],
  );

  const handleSelectNode = useCallback(
    (nodeId: string, isCompleted: boolean) => {
      setSelectedNodeId(nodeId);
      capture('learning_node_opened', {
        completion_state: isCompleted ? 'completed' : 'incomplete',
      });
    },
    [setSelectedNodeId],
  );

  if (!isOpen) return null;

  const progressPercent = progress?.progressPercentage ?? 0;

  return (
    <aside className="border-border bg-surface-raised flex max-h-[36rem] w-full shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm lg:h-full lg:max-h-none lg:w-[320px]">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{VIEWER_MESSAGES.SIDEBAR_TITLE}</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="사이드바 닫기"
            className="text-muted-foreground hover:bg-muted focus-visible:ring-ring rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {roadmapId && progress && (
        <div className="border-border border-b px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{VIEWER_MESSAGES.PROGRESS_LABEL}</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <div className="bg-muted mt-1.5 h-2 rounded-full">
            <div
              className="bg-primary h-full w-full origin-left rounded-full transition-transform"
              style={{ transform: `scaleX(${progressPercent / 100})` }}
            />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="border-border border-b px-4 py-3">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder={VIEWER_MESSAGES.SIDEBAR_SEARCH_PLACEHOLDER}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto">
        {filteredNodes.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">
            {VIEWER_MESSAGES.SIDEBAR_EMPTY}
          </p>
        ) : (
          <ul className="p-2">
            {filteredNodes.map((node) => {
              const data = node.data as JagalchiNodeData;
              const isSelected = node.id === selectedNodeId;
              const isCompleted = completedIds.has(node.id);
              return (
                <li key={node.id} className="flex items-center gap-1">
                  {roadmapId && isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(node.id)}
                      className="focus-visible:ring-ring shrink-0 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      aria-label={
                        isCompleted
                          ? VIEWER_MESSAGES.NODE_COMPLETED
                          : VIEWER_MESSAGES.NODE_INCOMPLETE
                      }
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="text-success h-4 w-4" />
                      ) : (
                        <Circle className="text-muted-foreground h-4 w-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelectNode(node.id, isCompleted)}
                    className={`focus-visible:ring-ring flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      isSelected
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-foreground hover:bg-muted'
                    } ${isCompleted ? 'line-through opacity-60' : ''}`}
                  >
                    {data.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Detail panel */}
        {selectedNode && selectedNode.type === 'jagalchi-node' && (
          <div className="border-border border-t p-4">
            <h3 className="text-sm font-semibold">
              {(selectedNode.data as JagalchiNodeData).label}
            </h3>
            {(selectedNode.data as JagalchiNodeData).description && (
              <div className="mt-3">
                <p className="text-muted-foreground text-xs font-medium">
                  {VIEWER_MESSAGES.SIDEBAR_DETAIL_DESCRIPTION}
                </p>
                <p className="mt-1 text-sm">
                  {(selectedNode.data as JagalchiNodeData).description}
                </p>
              </div>
            )}
            {(selectedNode.data as JagalchiNodeData).resources?.length > 0 && (
              <div className="mt-3">
                <p className="text-muted-foreground text-xs font-medium">
                  {VIEWER_MESSAGES.SIDEBAR_DETAIL_RESOURCES}
                </p>
                <ul className="mt-1 space-y-1">
                  {(selectedNode.data as JagalchiNodeData).resources.map((url) => (
                    <li key={url}>
                      <a
                        href={sanitizeUrl(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => capture('learning_resource_opened', {})}
                        className="text-primary focus-visible:ring-ring block truncate rounded-sm text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-border text-muted-foreground border-t px-4 py-2 text-xs">
        {VIEWER_MESSAGES.SIDEBAR_TOTAL_COUNT.replace('{count}', String(nodeItems.length))}
      </div>
    </aside>
  );
}
