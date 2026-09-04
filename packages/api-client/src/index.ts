export interface ApiTransport {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

import type { components } from './schema.generated.js';

export type ProjectRunProjection = components['schemas']['ProjectRunProjectionDto'];
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
): Promise<void> {
  await transport.request<void>(path, {
    method: 'POST',
    headers: {
      'if-match': headers.ifMatch,
      'idempotency-key': headers.idempotencyKey,
    },
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

export function blockProjectRunTask(
  transport: ApiTransport,
  runId: string,
  taskId: string,
  headers: ProjectRunCommandHeaders,
): Promise<void> {
  return postProjectRunCommand(transport, taskCommandPath(runId, taskId, 'block'), headers);
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
