'use client';

import { useEffect, useRef } from 'react';

import { ReactFlowProvider } from '@xyflow/react';
import { useAtom, useAtomValue } from 'jotai';
import { LayoutGrid, Map, PanelRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { VIEWER_MESSAGES } from '@/constants/messages';
import { capture } from '@/lib/analytics/client';

import { useViewerRoadmapLoader } from '../../hooks/use-viewer-roadmap-loader';
import {
  viewerErrorAtom,
  viewerLayoutAtom,
  viewerLoadingAtom,
  viewerRoadmapAtom,
  viewerSidebarOpenAtom,
} from '../../stores/viewer-atoms';
import { CardListMode } from '../CardListMode';
import { ForkTreeDialog } from '../ForkTreeDialog';
import { HeaderExportMenu } from '../HeaderExportMenu';
import { HeaderMenu } from '../HeaderMenu';
import { HeaderSaveAsImageMenu } from '../HeaderSaveAsImageMenu';
import { RoadmapHeader } from '../RoadmapHeader';
import { ViewerCanvas } from '../ViewerCanvas';
import { ViewerSidebar } from '../ViewerSidebar';
import { ViewerZoomControls } from '../ViewerZoomControls';

interface RoadmapViewerProps {
  roadmapId: string;
}

function ViewerContent({ roadmapId }: RoadmapViewerProps) {
  useViewerRoadmapLoader(roadmapId);

  const isLoading = useAtomValue(viewerLoadingAtom);
  const error = useAtomValue(viewerErrorAtom);
  const roadmap = useAtomValue(viewerRoadmapAtom);
  const [layout, setLayout] = useAtom(viewerLayoutAtom);
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(viewerSidebarOpenAtom);
  const capturedRoadmapId = useRef<string | null>(null);

  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    setLayout('cards');
    setIsSidebarOpen(false);
  }, [setIsSidebarOpen, setLayout]);

  useEffect(() => {
    if (!roadmap || capturedRoadmapId.current === roadmapId) return;
    if (capture('roadmap_viewed', {})) capturedRoadmapId.current = roadmapId;
  }, [roadmap, roadmapId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{VIEWER_MESSAGES.LOADING}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">{VIEWER_MESSAGES.ERROR_NOT_FOUND}</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <RoadmapHeader
        roadmapId={roadmapId}
        roadmapTitle={roadmap?.title ?? VIEWER_MESSAGES.DEFAULT_ROADMAP_TITLE}
      />

      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:flex-row">
        <div className="relative min-w-0 flex-1">
          {/* Toolbar row */}
          <div className="border-border bg-surface mb-3 flex items-center gap-2 overflow-x-auto rounded-lg border px-2 py-1.5">
            <HeaderMenu />
            <HeaderExportMenu />
            <HeaderSaveAsImageMenu />
            <ForkTreeDialog roadmapId={roadmapId} />
            <div className="bg-muted ml-auto flex shrink-0 items-center gap-1 rounded-lg p-1">
              <Button
                intent={layout === 'page' ? 'primary' : 'neutral'}
                variant={layout === 'page' ? 'solid' : 'outline'}
                size="sm"
                onClick={() => setLayout('page')}
                aria-pressed={layout === 'page'}
                className="focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <Map className="mr-1.5 h-4 w-4" />
                {VIEWER_MESSAGES.VIEW_CANVAS}
              </Button>
              <Button
                intent={layout === 'cards' ? 'primary' : 'neutral'}
                variant={layout === 'cards' ? 'solid' : 'outline'}
                size="sm"
                onClick={() => setLayout('cards')}
                aria-pressed={layout === 'cards'}
                className="focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                {VIEWER_MESSAGES.VIEW_CARDS}
              </Button>
              {!isSidebarOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label={VIEWER_MESSAGES.SIDEBAR_OPEN_BUTTON_LABEL}
                  intent="neutral"
                  className="focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Main content */}
          {layout === 'cards' ? <CardListMode /> : <ViewerCanvas />}
        </div>

        <ViewerSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          roadmapId={roadmapId}
        />
      </div>

      {layout === 'page' && <ViewerZoomControls />}
    </div>
  );
}

export function RoadmapViewer({ roadmapId }: RoadmapViewerProps) {
  return (
    <ReactFlowProvider>
      <ViewerContent roadmapId={roadmapId} />
    </ReactFlowProvider>
  );
}
