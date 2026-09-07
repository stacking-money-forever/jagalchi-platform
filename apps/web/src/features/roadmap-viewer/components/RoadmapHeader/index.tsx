'use client';

import { useRouter } from 'next/navigation';

import { useAtomValue } from 'jotai';
import { ArrowLeft, GitFork, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VIEWER_MESSAGES } from '@/constants/messages';
import { useForkRoadmap } from '@/hooks/use-fork-roadmap';
import { useForkStatus } from '@/hooks/use-fork-status';
import { isAuthenticatedAtom } from '@/lib/auth-atoms';

interface RoadmapHeaderProps {
  roadmapId?: string;
  roadmapTitle?: string;
}

export function RoadmapHeader({
  roadmapId = '',
  roadmapTitle = VIEWER_MESSAGES.DEFAULT_ROADMAP_TITLE,
}: RoadmapHeaderProps) {
  const router = useRouter();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const { data: forkStatus } = useForkStatus(roadmapId);
  const { mutate: forkRoadmap, isPending: isForkPending } = useForkRoadmap();

  const handleFork = () => {
    if (!roadmapId || !isAuthenticated || forkStatus?.forkedByCurrentUser) return;
    forkRoadmap(roadmapId, {
      onSuccess: (data) => {
        router.push(`/editor/${data.id}`);
      },
    });
  };

  return (
    <header className="border-border bg-surface flex min-h-14 w-full items-center gap-3 border-b px-3 py-2 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          intent="neutral"
          variant="ghost"
          size="icon-sm"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="min-w-0 truncate px-1 text-base leading-tight font-extrabold tracking-tight sm:text-lg">
          {roadmapTitle}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="relative hidden lg:block">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder={VIEWER_MESSAGES.SEARCH_PLACEHOLDER}
            className="border-border bg-surface placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-[200px] rounded-lg border pl-9 text-sm focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>
        <Button
          onClick={handleFork}
          disabled={!isAuthenticated || isForkPending || forkStatus?.forkedByCurrentUser}
          intent="neutral"
          variant="outline"
          className="h-9 rounded-lg px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 sm:px-4 sm:text-sm"
          title={
            forkStatus?.forkedByCurrentUser
              ? VIEWER_MESSAGES.FORK_ALREADY_FORKED
              : VIEWER_MESSAGES.FORK_BUTTON
          }
        >
          <GitFork className="mr-1.5 h-4 w-4" />
          {forkStatus?.forkedByCurrentUser
            ? VIEWER_MESSAGES.FORK_ALREADY_FORKED
            : VIEWER_MESSAGES.FORK_BUTTON}
        </Button>
      </div>
    </header>
  );
}
