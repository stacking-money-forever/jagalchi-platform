import React from 'react';

import Image from 'next/image';

import { Ellipsis, SquareDashed } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MY_ROADMAPS_MESSAGES } from '@/constants/messages';
import { cn } from '@/lib/utils';

interface RoadmapCardProps {
  id?: string;
  title: string;
  type?: 'Roadmap' | 'Directory';
  author?: string;
  fileCount?: number;
  imageUrl?: string;
  isFavorite?: boolean;
  className?: string;
  onClick?: () => void;
  onFavorite?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
}

export function RoadmapCard({
  title,
  type = 'Roadmap',
  author,
  fileCount,
  imageUrl,
  isFavorite: _isFavorite,
  className,
  onClick,
  onFavorite,
  onRename,
  onMove,
  onDelete,
}: RoadmapCardProps) {
  const isDirectory = type === 'Directory';

  return (
    <Card
      intent="neutral"
      variant="surface"
      padding="none"
      radius="sm"
      role="article"
      aria-label={title}
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'group bg-muted relative flex h-[200px] w-full min-w-0 cursor-pointer flex-col overflow-hidden shadow-none',
        'focus-visible:ring-ring/40 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
      onClick={onClick}
    >
      {/* Thumbnail Area */}
      <div className="bg-muted relative flex-1">
        {isDirectory ? (
          <div className="relative h-full w-full">
            <div className="bg-card absolute top-0 left-0 h-4 w-24 rounded-t-lg" />
            <div className="bg-card absolute inset-0 top-4 flex items-center justify-center rounded-tr-lg">
              <SquareDashed className="text-muted-foreground/30 h-8 w-8" />
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            {imageUrl ? (
              <Image src={imageUrl} alt={title} fill className="object-cover" sizes="304px" />
            ) : (
              <SquareDashed className="text-muted-foreground/30 h-8 w-8" />
            )}
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="bg-card flex items-center px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-foreground truncate text-sm leading-[21px]">{title}</p>
          <p className="text-muted-foreground truncate text-xs leading-4">
            {isDirectory
              ? `${fileCount ?? 0}${MY_ROADMAPS_MESSAGES.CARD_FILE_COUNT_SUFFIX}`
              : `작성자 ${author ?? '알 수 없음'}`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              intent="neutral"
              variant="ghost"
              size="icon-sm"
              aria-label={MY_ROADMAPS_MESSAGES.CARD_MORE_ARIA}
              className="text-muted-foreground/60 hover:text-foreground size-6 shrink-0 rounded-md p-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Ellipsis className="size-[13px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[72px] p-[10px]">
            {!isDirectory && (
              <>
                <DropdownMenuItem
                  className="cursor-pointer justify-center text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavorite?.();
                  }}
                >
                  {MY_ROADMAPS_MESSAGES.CARD_FAVORITE}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              className="cursor-pointer justify-center text-sm"
              onClick={(e) => {
                e.stopPropagation();
                onRename?.();
              }}
            >
              {MY_ROADMAPS_MESSAGES.CARD_RENAME}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer justify-center text-sm"
              onClick={(e) => {
                e.stopPropagation();
                onMove?.();
              }}
            >
              {MY_ROADMAPS_MESSAGES.CARD_MOVE}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer justify-center text-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
            >
              {MY_ROADMAPS_MESSAGES.CARD_DELETE}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
