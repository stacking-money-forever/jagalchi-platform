'use client';

import { useCallback, useRef } from 'react';

import { isWorkflowTerminal, type WorkflowOperationView } from '@jagalchi/api-client';

import { fetchWorkflowOperation } from '../lib/workflow-fetch';

export function useWorkflowOperationPoller() {
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const pollUntilTerminal = useCallback(
    async (
      operationId: string,
      onTick?: (operation: WorkflowOperationView) => void,
    ): Promise<WorkflowOperationView> => {
      stop();
      const controller = new AbortController();
      abortRef.current = controller;

      while (!controller.signal.aborted) {
        const { operation, retryAfterMs } = await fetchWorkflowOperation(
          operationId,
          controller.signal,
        );
        onTick?.(operation);
        if (isWorkflowTerminal(operation.state)) {
          return operation;
        }
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(resolve, retryAfterMs);
          controller.signal.addEventListener(
            'abort',
            () => {
              window.clearTimeout(timer);
              reject(new Error('WORKFLOW_POLL_ABORTED'));
            },
            { once: true },
          );
        });
      }

      throw new Error('WORKFLOW_POLL_ABORTED');
    },
    [stop],
  );

  return { pollUntilTerminal, stop };
}
