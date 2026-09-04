'use client';

import { Button } from '@/components/ui/button';

import type { OperationFailureView } from '../lib/operation-errors';

export function OperationStatusPanel({
  title,
  message,
  busy = false,
  failure,
  cancelled = false,
  onRetry,
  onCancel,
}: {
  title: string;
  message?: string;
  busy?: boolean;
  failure?: OperationFailureView | null;
  cancelled?: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  if (cancelled) {
    return (
      <section className="border-border bg-muted/30 rounded-2xl border p-6" role="status">
        <h2 className="text-lg font-bold">작업이 취소됐습니다</h2>
        <p className="text-muted-foreground mt-2 text-sm">다시 시도하거나 입력을 수정해 주세요.</p>
        {onRetry ? (
          <Button className="mt-4" onClick={onRetry}>
            다시 시도
          </Button>
        ) : null}
      </section>
    );
  }

  if (failure) {
    return (
      <section
        className="border-destructive/40 bg-destructive/5 rounded-2xl border p-6"
        role="alert"
      >
        <h2 className="text-lg font-bold">{failure.title}</h2>
        <p className="text-muted-foreground mt-2 text-sm">{failure.message}</p>
        {failure.code ? (
          <p className="text-muted-foreground mt-1 text-xs">코드: {failure.code}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {failure.retryable && onRetry ? <Button onClick={onRetry}>다시 시도</Button> : null}
          {onCancel ? (
            <Button variant="outline" onClick={onCancel}>
              취소
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className="border-border bg-card rounded-2xl border p-6"
      aria-busy={busy}
      role="status"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      {message ? <p className="text-muted-foreground mt-2 text-sm">{message}</p> : null}
      {busy ? <p className="text-primary mt-4 text-sm font-semibold">처리 중…</p> : null}
      {onCancel ? (
        <Button className="mt-4" variant="outline" onClick={onCancel}>
          작업 취소
        </Button>
      ) : null}
    </section>
  );
}
