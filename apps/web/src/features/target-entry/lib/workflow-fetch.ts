import type { WorkflowOperationView } from '@jagalchi/api-client';

export function parseRetryAfterMs(response: Response, fallbackMs = 2000): number {
  const header = response.headers.get('Retry-After');
  if (!header) return fallbackMs;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 30_000);
  }
  return fallbackMs;
}

export async function fetchWorkflowOperation(
  operationId: string,
  signal?: AbortSignal,
): Promise<{ operation: WorkflowOperationView; retryAfterMs: number }> {
  const response = await fetch(`/api/workflow-operations/${encodeURIComponent(operationId)}`, {
    method: 'GET',
    signal,
    credentials: 'include',
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => undefined)) as
      { code?: string; message?: string } | undefined;
    const failure = new Error(error?.message ?? '워크플로 상태를 불러오지 못했습니다.');
    (failure as Error & { status?: number; code?: string }).status = response.status;
    (failure as Error & { status?: number; code?: string }).code = error?.code;
    throw failure;
  }
  const operation = (await response.json()) as WorkflowOperationView;
  return { operation, retryAfterMs: parseRetryAfterMs(response) };
}
