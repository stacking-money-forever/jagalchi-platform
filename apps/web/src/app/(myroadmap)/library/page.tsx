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
import type { RoadmapSummary } from '@/types/roadmap.types';

export default function LibraryPage() {
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

  const items: RoadmapSummary[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((roadmap) => ({
      id: roadmap.id,
      isShared: roadmap.visibility === 'PUBLIC',
      title: roadmap.title,
      type: 'Roadmap' as const,
      updatedAt: roadmap.updatedAt,
      author: currentUserName ?? undefined,
    }));
  }, [currentUserName, data]);

  const filteredRoadmaps = useMemo(
    () =>
      items
        .filter((roadmap) => {
          if (activeCategory === 'shared' && !roadmap.isShared) return false;
          if (activeCategory === 'favorites' && !roadmap.isFavorite) return false;
          if (filterCategory !== 'all' && roadmap.type !== 'Roadmap') return false;
          return (
            !trimmedSearchQuery ||
            roadmap.title.toLowerCase().includes(trimmedSearchQuery.toLowerCase())
          );
        })
        .sort((a, b) => {
          const comparison =
            sortBy === 'recent'
              ? new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
              : sortBy === 'name'
                ? (b.title || '').localeCompare(a.title || '')
                : (b.fileCount || 0) - (a.fileCount || 0);
          return sortOrder === 'asc' ? -comparison : comparison;
        }),
    [activeCategory, filterCategory, items, sortBy, sortOrder, trimmedSearchQuery],
  );
  const emptyMessage = trimmedSearchQuery
    ? MY_ROADMAPS_MESSAGES.SEARCH_EMPTY
    : MY_ROADMAPS_MESSAGES.EMPTY;

  const handleLogout = async () => {
    try {
      await logoutSession();
      router.push('/login');
    } catch {
      toast.error('로그아웃에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <MyRoadmapsLayout
      activeTab="library"
      onLogout={handleLogout}
      onProfileClick={() => router.push('/profile')}
      userEmail={currentUserEmail}
      userName={currentUserName}
    >
      <div className="flex h-full flex-col">
        <MyRoadmapsHeader title="라이브러리" description="저장한 실행 과제와 폴더를 관리합니다." />
        <div className="flex-1 px-4 pb-8 sm:px-6 lg:px-10 lg:pb-10">
          {isLoading ? (
            <div className="flex min-h-40 items-center" role="status">
              <p className="text-muted-foreground">{MY_ROADMAPS_MESSAGES.LOADING}</p>
            </div>
          ) : (
            <>
              <MyRoadmapsToolbar />
              <div className="mt-6">
                <MyRoadmapsGrid emptyMessage={emptyMessage} roadmaps={filteredRoadmaps} />
              </div>
            </>
          )}
        </div>
      </div>
    </MyRoadmapsLayout>
  );
}
