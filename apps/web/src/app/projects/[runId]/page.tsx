import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { projectRunQueryKey } from '@jagalchi/api-client';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app-shell/app-shell';
import { ProjectRunLive } from '@/features/project-runs/project-run-live';
import {
  ProjectRunSkeleton,
  SessionRenewalBoundary,
} from '@/features/project-runs/session-renewal-boundary';
import { getProjectRunForRequest } from '@/server/nest-project-runs';

async function ProjectRunContent({ runId }: { runId: string }) {
  const result = await getProjectRunForRequest(runId);
  if (result.status === 'not-found') notFound();
  if (result.status === 'session-expired') return <SessionRenewalBoundary />;

  const queryClient = new QueryClient();
  queryClient.setQueryData(projectRunQueryKey(runId), result.data);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectRunLive initialRun={result.data} />
    </HydrationBoundary>
  );
}

async function ProjectRunFromParams({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <ProjectRunContent runId={runId} />;
}

export default function ProjectRunPage({ params }: { params: Promise<{ runId: string }> }) {
  return (
    <AppShell activeTab="my">
      <div>
        <Suspense fallback={<ProjectRunSkeleton />}>
          <ProjectRunFromParams params={params} />
        </Suspense>
      </div>
    </AppShell>
  );
}
