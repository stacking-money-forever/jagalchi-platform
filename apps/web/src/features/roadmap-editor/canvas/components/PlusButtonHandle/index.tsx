'use client';

import { forwardRef, useState } from 'react';

import { Plus } from 'lucide-react';

import { EDITOR_MESSAGES } from '@/constants/messages';
import { cn } from '@/lib/utils';

export interface PlusButtonHandleProps {
  position: 'top' | 'right' | 'bottom' | 'left';
  onCreateNode: (position: 'top' | 'right' | 'bottom' | 'left') => void;
  className?: string;
}

const POSITION_STYLES = {
  top: 'left-1/2 -translate-x-1/2 -top-8',
  right: 'top-1/2 -translate-y-1/2 -right-8',
  bottom: 'left-1/2 -translate-x-1/2 -bottom-8',
  left: 'top-1/2 -translate-y-1/2 -left-8',
} as const;

const GHOST_POSITION_STYLES = {
  top: 'left-1/2 -translate-x-1/2 -top-[120px]',
  right: 'top-1/2 -translate-y-1/2 -right-[250px]',
  bottom: 'left-1/2 -translate-x-1/2 -bottom-[120px]',
  left: 'top-1/2 -translate-y-1/2 -left-[250px]',
} as const;

export const PlusButtonHandle = forwardRef<HTMLButtonElement, PlusButtonHandleProps>(
  ({ position, onCreateNode, className }, ref) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = () => {
      onCreateNode(position);
    };

    const getPositionLabel = (pos: 'top' | 'right' | 'bottom' | 'left') => {
      const labels = {
        top: '위쪽에 실행 단계 추가',
        right: '오른쪽에 실행 단계 추가',
        bottom: '아래쪽에 실행 단계 추가',
        left: '왼쪽에 실행 단계 추가',
      };
      return labels[pos];
    };

    return (
      <>
        {/* Plus Button */}
        <button
          ref={ref}
          type="button"
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            'border-primary bg-background hover:bg-primary-subtle absolute z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-[color,background-color,border-color,transform] hover:scale-110',
            POSITION_STYLES[position],
            className,
          )}
          aria-label={getPositionLabel(position)}
        >
          <Plus className="text-primary h-4 w-4" />
        </button>

        {/* Ghost Node Preview */}
        {isHovered && (
          <div
            className={cn(
              'border-primary/70 bg-card pointer-events-none absolute z-0 flex h-12 min-w-[200px] items-center justify-center rounded-lg border-2 border-dashed px-5 py-2.5 opacity-70',
              GHOST_POSITION_STYLES[position],
            )}
          >
            <span className="text-foreground truncate text-base font-medium">
              {EDITOR_MESSAGES.NEW_NODE_LABEL}
            </span>
          </div>
        )}
      </>
    );
  },
);

PlusButtonHandle.displayName = 'PlusButtonHandle';
