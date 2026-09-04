'use client';

import {
  createApiTransport,
  deferProjectRunTask,
  getProjectRun,
  projectRunQueryKey,
  publishProjectRun,
  resumeProjectRunTask,
  reverifyProjectRun,
  startProjectRunTask,
  unpublishProjectRun,
  verifyProjectRunTask,
  type ProjectRunProjection,
} from '@jagalchi/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';

const transport = createApiTransport('/api', fetch);

type CommandArgs = { taskId: string };

async function refreshRun(queryClient: ReturnType<typeof useQueryClient>, runId: string) {
  const next = await getProjectRun(transport, runId);
  queryClient.setQueryData(projectRunQueryKey(runId), next);
  return next;
}

export function useProjectRunCommands(run: ProjectRunProjection) {
  const queryClient = useQueryClient();
  const headers = () => ({ ifMatch: String(run.version), idempotencyKey: nanoid() });

  const afterCommand = async () => {
    await refreshRun(queryClient, run.id);
  };

  const start = useMutation({
    mutationFn: ({ taskId }: CommandArgs) =>
      startProjectRunTask(transport, run.id, taskId, headers()),
    onSuccess: afterCommand,
  });
  const defer = useMutation({
    mutationFn: ({ taskId }: CommandArgs) =>
      deferProjectRunTask(transport, run.id, taskId, headers()),
    onSuccess: afterCommand,
  });
  const resume = useMutation({
    mutationFn: ({ taskId }: CommandArgs) =>
      resumeProjectRunTask(transport, run.id, taskId, headers()),
    onSuccess: afterCommand,
  });
  const verify = useMutation({
    mutationFn: ({ taskId }: CommandArgs) =>
      verifyProjectRunTask(transport, run.id, taskId, headers()),
    onSuccess: afterCommand,
  });
  const publish = useMutation({
    mutationFn: () => publishProjectRun(transport, run.id, headers()),
    onSuccess: afterCommand,
  });
  const unpublish = useMutation({
    mutationFn: () => unpublishProjectRun(transport, run.id, headers()),
    onSuccess: afterCommand,
  });
  const reverify = useMutation({
    mutationFn: () => reverifyProjectRun(transport, run.id, headers()),
    onSuccess: afterCommand,
  });

  return { start, defer, resume, verify, publish, unpublish, reverify };
}
