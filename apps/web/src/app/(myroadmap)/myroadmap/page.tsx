'use client';

import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { useAtomValue } from 'jotai';
import { toast } from 'sonner';

import { useAuthSession } from '@/components/providers/AuthSessionContext';
import { MY_ROADMAPS_MESSAGES } from '@/constants/messages';
import { currentUserEmailAtom, currentUserNameAtom } from '@/features/auth';
import { MyRoadmapsToolbar } from '@/features/my-roadmaps/components/molecules/MyRoadmapsToolbar';
import { MyRoadmapsGrid } from '@/features/my-roadmaps/components/organisms/MyRoadmapsGrid';
import { MyRoadmapsHeader } from '@/features/my-roadmaps/components/organisms/MyRoadmapsHeader';
import { MyRoadmapsLayout } from '@/features/my-roadmaps/components/templates';
import { useRoadmaps } from '@/features/my-roadmaps/hooks/use-roadmaps';
import {
  filterCategoryAtom,
  searchQueryAtom,
  sidebarCategoryAtom,
  sortByAtom,
  sortOrderAtom,
} from '@/features/my-roadmaps/stores/my-roadmaps.atoms';
import { ProjectRunsSection } from '@/features/project-runs/components/project-runs-section';
import { useProjectRuns } from '@/features/project-runs/hooks/use-project-runs';
import { isEnabled } from '@/lib/feature-flags';
import type { RoadmapSummary } from '@/types/roadmap.types';

export default function MyRoadmapsPage() {
  const router = useRouter();
  const { logoutSession } = useAuthSession();
  const activeCategory = useAtomValue(sidebarCategoryAtom);
  const sortOrder = useAtomValue(sortOrderAtom);
  const sortBy = useAtomValue(sortByAtom);
  const filterCategory = useAtomValue(filterCategoryAtom);
  const searchQuery = useAtomValue(searchQueryAtom);
  const currentUserName = useAtomValue(currentUserNameAtom);
  const currentUserEmail = useAtomValue(currentUserEmailAtom);
  const trimmedSearchQuery = searchQuery.trim();

  const { data, isLoading } = useRoadmaps(
    trimmedSearchQuery ? { search: trimmedSearchQuery } : undefined,
  );
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

  // 서버 응답 → RoadmapSummary 매핑
  const items: RoadmapSummary[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((r) => ({
      id: r.id,
      isShared: r.visibility === 'PUBLIC',
      title: r.title,
      type: 'Roadmap' as const,
      updatedAt: r.updatedAt,
      author: currentUserName ?? undefined,
    }));
  }, [currentUserName, data]);

  const handleLogout = async () => {
    try {
      await logoutSession();
      router.push('/login');
    } catch {
      toast.error('로그아웃에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const filteredRoadmaps = useMemo(
    () =>
      items
        .filter((roadmap) => {
          let categoryMatch = false;
          switch (activeCategory) {
            case 'recent':
              categoryMatch = true;
              break;
            case 'community':
              categoryMatch = true;
              break;
            case 'my-roadmap':
              categoryMatch = true;
              break;
            case 'shared':
              categoryMatch = !!roadmap.isShared;
              break;
            case 'favorites':
              categoryMatch = !!roadmap.isFavorite;
              break;
            default:
              categoryMatch = true;
          }

          if (!categoryMatch) return false;

          if (filterCategory !== 'all') {
            const typeMatch =
              filterCategory === 'roadmap'
                ? roadmap.type === 'Roadmap'
                : roadmap.type === 'Directory';
            if (!typeMatch) return false;
          }

          if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            if (!roadmap.title.toLowerCase().includes(lowerQuery)) return false;
          }

          return true;
        })
        .sort((a, b) => {
          let comparison = 0;
          switch (sortBy) {
            case 'recent':
              comparison =
                new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
              break;
            case 'name':
              comparison = (b.title || '').localeCompare(a.title || '');
              break;
            case 'size':
              comparison = (b.fileCount || 0) - (a.fileCount || 0);
              break;
            default:
              comparison = 0;
          }

          return sortOrder === 'asc' ? -comparison : comparison;
        }),
    [items, sortOrder, sortBy, filterCategory, activeCategory, searchQuery],
  );
  const emptyMessage = trimmedSearchQuery
    ? MY_ROADMAPS_MESSAGES.SEARCH_EMPTY
    : MY_ROADMAPS_MESSAGES.EMPTY;

  if (isLoading) {
    return (
      <MyRoadmapsLayout
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
        userEmail={currentUserEmail}
        userName={currentUserName}
      >
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">{MY_ROADMAPS_MESSAGES.LOADING}</p>
        </div>
      </MyRoadmapsLayout>
    );
  }

  return (
    <MyRoadmapsLayout
      onLogout={handleLogout}
      onProfileClick={handleProfileClick}
      userEmail={currentUserEmail}
      userName={currentUserName}
    >
      <div className="flex h-full flex-col">
        <MyRoadmapsHeader userName={currentUserName ?? undefined} />
        <div className="flex-1 px-4 pb-8 sm:px-6 lg:px-10 lg:pb-10">
          <ProjectRunsSection
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
          <MyRoadmapsToolbar />
          <div className="mt-6">
            <MyRoadmapsGrid emptyMessage={emptyMessage} roadmaps={filteredRoadmaps} />
          </div>
        </div>
      </div>
    </MyRoadmapsLayout>
  );
}
