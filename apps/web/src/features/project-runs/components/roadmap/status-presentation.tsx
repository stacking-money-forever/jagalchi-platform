'use client';

import {
  AlertTriangle,
  Check,
  CircleDashed,
  Clock,
  Lock,
  Pause,
  Play,
  ShieldCheck,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import { STATE_LABEL_KO, type TaskState } from '../../projection';

export const STATE_ICON: Record<TaskState, React.ReactNode> = {
  LOCKED: <Lock aria-hidden className="size-3" />,
  READY: <Play aria-hidden className="size-3" />,
  IN_PROGRESS: <CircleDashed aria-hidden className="size-3" />,
  BLOCKED: <AlertTriangle aria-hidden className="size-3" />,
  DEFERRED: <Pause aria-hidden className="size-3" />,
  VERIFYING: <ShieldCheck aria-hidden className="size-3" />,
  DONE: <Check aria-hidden className="size-3" />,
};

export const STATE_CLASS: Record<TaskState, string> = {
  LOCKED: 'bg-muted text-muted-foreground border-border',
  READY: 'bg-primary-subtle text-foreground border-primary',
  IN_PROGRESS: 'bg-primary text-primary-foreground border-primary',
  BLOCKED: 'bg-warning-subtle text-foreground border-warning',
  DEFERRED: 'bg-muted text-muted-foreground border-dashed border-border',
  VERIFYING: 'bg-success-subtle text-foreground border-success',
  DONE: 'bg-success text-success-foreground border-success',
};

export function StatusChip({ state, className }: { state: TaskState; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-none font-bold',
        STATE_CLASS[state],
        className,
      )}
    >
      {STATE_ICON[state]}
      {STATE_LABEL_KO[state]}
    </span>
  );
}

export { Clock };
