'use client';

import { useMemo } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { MyProjectsHome } from '@/features/my-roadmaps/components/organisms/MyProjectsHome';
import { useProjectRuns } from '@/features/project-runs/hooks/use-project-runs';
import { isEnabled } from '@/lib/feature-flags';

export default function MyRoadmapsPage() {
  const projectRunsQuery = useProjectRuns();
  const projectRuns = useMemo(() => {
    const byId = new Map(
      (projectRunsQuery.data?.pages ?? [])
        .flatMap((page) => page.items)
        .map((run) => [run.id, run] as const),
    );
    return [...byId.values()];
  }, [projectRunsQuery.data?.pages]);
  const canCreateProjectRun =
    isEnabled('EVIDENCE_EXECUTION_ENABLED') && isEnabled('PROJECT_RUNS_ENABLED');

  return (
    <AppShell activeTab="home">
      <MyProjectsHome
        runs={projectRuns}
        isLoading={projectRunsQuery.isLoading}
        isError={projectRunsQuery.isError && projectRuns.length === 0}
        isNextPageError={projectRunsQuery.isFetchNextPageError}
        canCreateProjectRun={canCreateProjectRun}
        hasNextPage={projectRunsQuery.hasNextPage}
        isFetchingNextPage={projectRunsQuery.isFetchingNextPage}
        onRetry={() => void projectRunsQuery.refetch()}
        onRetryNextPage={() => void projectRunsQuery.fetchNextPage()}
        onLoadMore={() => void projectRunsQuery.fetchNextPage()}
      />
    </AppShell>
  );
}
