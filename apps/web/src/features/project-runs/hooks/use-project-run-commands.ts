'use client';

import {
  ApiResponseError,
  bindProjectRunPullRequest,
  blockProjectRunTask,
  createApiTransport,
  deferProjectRunTask,
  getProjectRun,
  projectRunQueryKey,
  publishProjectRun,
  requestProjectRunTaskAiHelp,
  resumeProjectRunTask,
  reverifyProjectRun,
  startProjectRunTask,
  unpublishProjectRun,
  verifyProjectRunTask,
  type ProjectRunProjection,
} from '@jagalchi/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createCsrfAwareFetch } from '@/api/client';

const transport = createApiTransport('/api', createCsrfAwareFetch());

type CommandArgs = { taskId: string };
type BlockArgs = CommandArgs & { reasonCode: string; note?: string };
type AiHelpArgs = CommandArgs & { question?: string };
type BindPullRequestArgs = { githubRepositoryId: string; pullNumber: number };

async function refreshRun(
  queryClient: ReturnType<typeof useQueryClient>,
  runId: string,
): Promise<ProjectRunProjection> {
  const next = await getProjectRun(transport, runId);
  queryClient.setQueryData(projectRunQueryKey(runId), next);
  return next;
}

export function useProjectRunCommands(run: ProjectRunProjection) {
  const queryClient = useQueryClient();
  const headers = () => ({ ifMatch: String(run.version), idempotencyKey: crypto.randomUUID() });

  const afterCommand = async () => {
    await refreshRun(queryClient, run.id);
  };
  const afterError = async (error: unknown) => {
    if (error instanceof ApiResponseError && error.status === 409) {
      await refreshRun(queryClient, run.id);
    }
  };

  const start = useMutation({
    mutationFn: ({ taskId }: CommandArgs) =>
      startProjectRunTask(transport, run.id, taskId, headers()),
    onSuccess: afterCommand,
    onError: afterError,
  });
  const block = useMutation({
    mutationFn: ({ taskId, reasonCode, note }: BlockArgs) =>
      blockProjectRunTask(transport, run.id, taskId, headers(), { reasonCode, note }),
    onSuccess: afterCommand,
    onError: afterError,
  });
  const defer = useMutation({
    mutationFn: ({ taskId }: CommandArgs) =>
      deferProjectRunTask(transport, run.id, taskId, headers()),
    onSuccess: afterCommand,
    onError: afterError,
  });
  const resume = useMutation({
    mutationFn: ({ taskId }: CommandArgs) =>
      resumeProjectRunTask(transport, run.id, taskId, headers()),
    onSuccess: afterCommand,
    onError: afterError,
  });
  const verify = useMutation({
    mutationFn: ({ taskId }: CommandArgs) =>
      verifyProjectRunTask(transport, run.id, taskId, headers()),
    onSuccess: afterCommand,
    onError: afterError,
  });
  const aiHelp = useMutation({
    mutationFn: ({ taskId, question }: AiHelpArgs) => {
      if (run.currentTaskId !== taskId) {
        throw new Error('AI_HELP_ACTIVE_TASK_REQUIRED');
      }
      return requestProjectRunTaskAiHelp(transport, run.id, taskId, headers(), { question });
    },
  });
  const bindPullRequest = useMutation({
    mutationFn: ({ githubRepositoryId, pullNumber }: BindPullRequestArgs) =>
      bindProjectRunPullRequest(transport, run.id, headers(), { githubRepositoryId, pullNumber }),
    onSuccess: afterCommand,
    onError: afterError,
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

  return {
    start,
    defer,
    block,
    resume,
    verify,
    aiHelp,
    bindPullRequest,
    publish,
    unpublish,
    reverify,
  };
}
