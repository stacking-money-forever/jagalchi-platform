'use client';

import { memo } from 'react';

import { useRouter } from 'next/navigation';

import { useAtomValue } from 'jotai';
import { ChevronLeft, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { REALTIME_MESSAGES } from '@/constants/messages';

import { roadmapTitleAtom } from '../../../stores/editor-atoms';

interface EditorHeaderProps {
  onBack?: () => void;
  isConnected?: boolean;
  roadmapId?: string;
}

export const EditorHeader = memo(function EditorHeader({
  onBack,
  isConnected,
  roadmapId,
}: EditorHeaderProps) {
  const router = useRouter();
  const title = useAtomValue(roadmapTitleAtom);

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/myroadmap');
    }
  };

  return (
    <header className="border-border bg-card text-foreground absolute top-3 left-3 z-10 flex w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-2 rounded-lg border p-2 shadow-md sm:top-4 sm:left-4 sm:w-auto">
      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
        <Button
          type="button"
          intent="neutral"
          variant="ghost"
          size="xs"
          className="min-h-8 min-w-8 shrink-0 rounded-lg p-[7px]"
          onClick={handleBackClick}
          aria-label="뒤로가기"
        >
          <ChevronLeft className="h-[15px] w-[15px]" />
        </Button>

        <span className="text-foreground min-w-0 flex-1 truncate text-base leading-6 font-semibold">
          {title || '새 실행 과제'}
        </span>

        <span className="text-muted-foreground hidden shrink-0 text-xs leading-4 font-medium tracking-[0.18px] sm:inline">
          편집 중
        </span>

        {isConnected !== undefined && (
          <span
            className="flex shrink-0 items-center gap-1 text-xs leading-4 font-medium"
            aria-label={
              isConnected
                ? REALTIME_MESSAGES.CONNECTION_CONNECTED
                : REALTIME_MESSAGES.CONNECTION_DISCONNECTED
            }
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isConnected ? 'bg-success' : 'bg-muted-foreground'
              }`}
            />
            <span
              className={
                isConnected
                  ? 'text-success hidden sm:inline'
                  : 'text-muted-foreground hidden sm:inline'
              }
            >
              {isConnected
                ? REALTIME_MESSAGES.CONNECTION_CONNECTED
                : REALTIME_MESSAGES.CONNECTION_DISCONNECTED}
            </span>
          </span>
        )}

        {roadmapId ? (
          <Button
            type="button"
            intent="neutral"
            variant="ghost"
            size="xs"
            className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg p-[7px]"
            onClick={() => router.push(`/viewer/${roadmapId}`)}
            aria-label="뷰어 미리보기"
          >
            <Eye className="h-[15px] w-[15px]" />
          </Button>
        ) : null}
      </div>

      <p className="text-muted-foreground max-w-sm px-2 pb-1 text-xs leading-5">
        단계마다 완료 조건과 PR·테스트·배포 증거를 연결하세요.
      </p>
    </header>
  );
});
