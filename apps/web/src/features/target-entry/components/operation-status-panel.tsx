'use client';

import { Button } from '@/components/ui/button';

import type { OperationFailureView } from '../lib/operation-errors';

export function OperationStatusPanel({
  title,
  message,
  busy = false,
  failure,
  cancellation,
  onRetry,
  onCancel,
}: {
  title?: string;
  message?: string;
  busy?: boolean;
  failure?: OperationFailureView | null;
  cancellation?: 'requested' | 'completed' | null;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  if (cancellation) {
    return (
      <section className="border-border bg-muted/30 rounded-2xl border p-6" role="status">
        <h2 className="text-lg font-bold">
          {cancellation === 'completed' ? '작업이 취소됐습니다' : '취소를 요청했습니다'}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {cancellation === 'completed'
            ? '입력과 선택은 그대로 남아 있습니다. 필요하면 수정한 뒤 다시 시작하세요.'
            : '취소 요청이 처리되기 전까지는 완료 여부를 확인할 수 없습니다. 입력과 선택은 그대로 남아 있습니다.'}
        </p>
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
