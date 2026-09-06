export interface ApiTransport {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

import type { components } from './schema.generated.js';

export type ProjectRunProjection = components['schemas']['ProjectRunProjectionDto'];
export type ProjectRunListResponse = components['schemas']['ProjectRunListResponseDto'];
export type ProjectRunState = ProjectRunProjection['state'];
export type NativeAuthSession = components['schemas']['NativeAuthResponse'];
export type RealtimeTicket = components['schemas']['RealtimeTicketResponseDto'];

export interface WebSessionUser {
  id: string;
  email: string;
  name: string;
  roles: readonly string[];
}

export interface WebSessionResponse {
  authenticated: true;
  user?: WebSessionUser;
}

export class ApiResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    message = 'API request failed',
  ) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

export function projectRunQueryKey(runId: string): readonly ['project-run', string] {
  return ['project-run', runId] as const;
}

export function createApiTransport(
  baseUrl: string,
  fetchImplementation: typeof globalThis.fetch,
  defaults: RequestInit = {},
): ApiTransport {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const headers = new Headers(defaults.headers);
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
      if (init.body !== undefined && init.body !== null && !headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      const response = await fetchImplementation(`${normalizedBaseUrl}/${path.replace(/^\//, '')}`, {
        ...defaults,
        ...init,
        headers,
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => undefined)) as
          | { code?: string; message?: string }
          | undefined;
        throw new ApiResponseError(response.status, error?.code, error?.message);
      }
      if (response.status === 204) {
        return undefined as T;
      }
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }
      return JSON.parse(text) as T;
    },
  };
}

export interface ProjectRunCommandHeaders {
  ifMatch: string;
  idempotencyKey: string;
}

async function postProjectRunCommand(
  transport: ApiTransport,
  path: string,
  headers: ProjectRunCommandHeaders,
  body?: unknown,
): Promise<void> {
  await transport.request<void>(path, {
    method: 'POST',
    headers: {
      'if-match': headers.ifMatch,
      'idempotency-key': headers.idempotencyKey,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function taskCommandPath(runId: string, taskId: string, action: string): string {
  return `/project-runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/${action}`;
}

function runCommandPath(runId: string, action: string): string {
  return `/project-runs/${encodeURIComponent(runId)}/${action}`;
}

export function startProjectRunTask(
  transport: ApiTransport,
  runId: string,
  taskId: string,
  headers: ProjectRunCommandHeaders,
): Promise<void> {
  return postProjectRunCommand(transport, taskCommandPath(runId, taskId, 'start'), headers);
}

export function deferProjectRunTask(
  transport: ApiTransport,
  runId: string,
  taskId: string,
  headers: ProjectRunCommandHeaders,
): Promise<void> {
  return postProjectRunCommand(transport, taskCommandPath(runId, taskId, 'defer'), headers);
}

export interface BlockProjectRunTaskBody {
  reasonCode: string;
  note?: string;
}

export function blockProjectRunTask(
  transport: ApiTransport,
  runId: string,
  taskId: string,
  headers: ProjectRunCommandHeaders,
  body: BlockProjectRunTaskBody = { reasonCode: 'USER_REQUESTED' },
): Promise<void> {
  return postProjectRunCommand(
    transport,
    taskCommandPath(runId, taskId, 'block'),
    headers,
    body,
  );
}

export function resumeProjectRunTask(
  transport: ApiTransport,
  runId: string,
  taskId: string,
  headers: ProjectRunCommandHeaders,
): Promise<void> {
  return postProjectRunCommand(transport, taskCommandPath(runId, taskId, 'resume'), headers);
}

export function verifyProjectRunTask(
  transport: ApiTransport,
  runId: string,
  taskId: string,
  headers: ProjectRunCommandHeaders,
): Promise<void> {
  return postProjectRunCommand(transport, taskCommandPath(runId, taskId, 'verify'), headers);
}
export type ProjectRunAiHelpProvenance = Record<string, unknown>;

export interface ProjectRunAiHelpRequest {
  question?: string;
}

export interface ProjectRunAiHelpResponse {
  guidance: string;
  provenance: ProjectRunAiHelpProvenance;
}

export function requestProjectRunTaskAiHelp(
  transport: ApiTransport,
  runId: string,
  taskId: string,
  headers: ProjectRunCommandHeaders,
  body: ProjectRunAiHelpRequest = {},
): Promise<ProjectRunAiHelpResponse> {
  return transport.request<ProjectRunAiHelpResponse>(
    `/project-runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/ai-help`,
    {
      method: 'POST',
      headers: {
        'if-match': headers.ifMatch,
        'idempotency-key': headers.idempotencyKey,
      },
      body: JSON.stringify(body),
    },
  );
}
export interface BindProjectRunPullRequestBody {
  githubRepositoryId: string;
  pullNumber: number;
}

export function bindProjectRunPullRequest(
  transport: ApiTransport,
  runId: string,
  headers: ProjectRunCommandHeaders,
  body: BindProjectRunPullRequestBody,
): Promise<void> {
  return postProjectRunCommand(transport, runCommandPath(runId, 'pull-request'), headers, body);
}


export function publishProjectRun(
  transport: ApiTransport,
  runId: string,
  headers: ProjectRunCommandHeaders,
): Promise<void> {
  return postProjectRunCommand(transport, runCommandPath(runId, 'publish'), headers);
}

export function unpublishProjectRun(
  transport: ApiTransport,
  runId: string,
  headers: ProjectRunCommandHeaders,
): Promise<void> {
  return postProjectRunCommand(transport, runCommandPath(runId, 'unpublish'), headers);
}

export function reverifyProjectRun(
  transport: ApiTransport,
  runId: string,
  headers: ProjectRunCommandHeaders,
): Promise<void> {
  return postProjectRunCommand(transport, runCommandPath(runId, 'reverify'), headers);
}

export function getProjectRun(
  transport: ApiTransport,
  runId: string,
  signal?: AbortSignal,
): Promise<ProjectRunProjection> {
  return transport.request<ProjectRunProjection>(`/project-runs/${encodeURIComponent(runId)}`, {
    method: 'GET',
    signal,
  });
}

export interface ProjectRunListParams {
  state?: ProjectRunState;
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export function listProjectRuns(
  transport: ApiTransport,
  params: ProjectRunListParams = {},
): Promise<ProjectRunListResponse> {
  const query = new URLSearchParams();
  if (params.state) query.set('state', params.state);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.cursor) query.set('cursor', params.cursor);
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return transport.request<ProjectRunListResponse>(`/project-runs${suffix}`, {
    method: 'GET',
    signal: params.signal,
  });
}

export * from './career-v1.js';
