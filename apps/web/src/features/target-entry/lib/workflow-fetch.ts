import {
  createApiTransport,
  getWorkflowOperation,
  type WorkflowOperationView,
} from '@jagalchi/api-client';

import { createCsrfAwareFetch } from '@/api/client';

export function parseRetryAfterMs(response: Response, fallbackMs = 2000): number {
  const header = response.headers.get('Retry-After');
  if (!header) return fallbackMs;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 30_000);
  }
  return fallbackMs;
}

let lastRetryAfterMs = 2000;

const csrfFetch = createCsrfAwareFetch();
const pollingFetch: typeof fetch = async (input, init) => {
  const response = await csrfFetch(input, init);
  lastRetryAfterMs = parseRetryAfterMs(response);
  return response;
};

const workflowPollingTransport = createApiTransport('/api', pollingFetch);

export async function fetchWorkflowOperation(
  operationId: string,
  signal?: AbortSignal,
): Promise<{ operation: WorkflowOperationView; retryAfterMs: number }> {
  const operation = await getWorkflowOperation(workflowPollingTransport, operationId, signal);
  return { operation, retryAfterMs: lastRetryAfterMs };
}
