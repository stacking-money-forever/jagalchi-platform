import { describe, expect, it, vi } from 'vitest';

import {
  bindProjectRunPullRequest,
  createApiTransport,
  getProjectRun,
  listProjectRuns,
  projectRunQueryKey,
  requestProjectRunTaskAiHelp,
} from './index.js';

describe('api-client', () => {
  it('normalizes paths and accepts an injected fetch implementation', async () => {
    const fetchImplementation = vi.fn(async () =>
      Response.json({
        id: 'run-1', state: 'ACTIVE', version: 1, currentTaskId: null,
        recommendedTaskId: null, plan: { id: 'plan-1', schemaVersion: 1 },
        map: { nodes: [], edges: [] }, tasks: [], proof: null,
      }),
    );
    const result = await getProjectRun(createApiTransport('https://api.example.com/', fetchImplementation), 'run 1');
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.com/project-runs/run%201',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.id).toBe('run-1');
    expect(projectRunQueryKey('run-1')).toEqual(['project-run', 'run-1']);
  });
  it('lists project runs with optional cursor query parameters', async () => {
    const fetchImplementation = vi.fn(async () =>
      Response.json({ items: [], nextCursor: 'next/page' }),
    ) as typeof fetch;
    const controller = new AbortController();
    const result = await listProjectRuns(
      createApiTransport('https://api.example.com/', fetchImplementation),
      { state: 'ACTIVE', limit: 20, cursor: 'cursor/value', signal: controller.signal },
    );

    expect(result).toEqual({ items: [], nextCursor: 'next/page' });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.com/project-runs?state=ACTIVE&limit=20&cursor=cursor%2Fvalue',
      expect.objectContaining({ method: 'GET', signal: controller.signal }),
    );
  });
  it('posts AI help through the active-task Project Run route', async () => {
    const fetchImplementation = vi.fn(async () =>
      Response.json({ guidance: '실행 기준을 확인하세요.', provenance: { model: 'fixture' } }),
    ) as typeof fetch;
    const result = await requestProjectRunTaskAiHelp(
      createApiTransport('https://api.example.com', fetchImplementation),
      'run/1',
      'task 1',
      { ifMatch: '7', idempotencyKey: 'help-1' },
      { question: '무엇을 확인하나요?' },
    );

    expect(result.provenance).toEqual({ model: 'fixture' });
    expect(result.guidance).toBe('실행 기준을 확인하세요.');
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.com/project-runs/run%2F1/tasks/task%201/ai-help',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ question: '무엇을 확인하나요?' }),
      }),
    );
  });

  it('binds a pull request through the Project Run command contract', async () => {
    let capturedHeaders: Headers | undefined;
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers as Headers | undefined;
      return Response.json({ id: 'operation-1' }, { status: 202 });
    }) as typeof fetch;
    const transport = createApiTransport('https://api.example.com', fetchImplementation);

    await bindProjectRunPullRequest(
      transport,
      'run/1',
      { ifMatch: '7', idempotencyKey: '11111111-1111-4111-8111-111111111111' },
      { githubRepositoryId: '12345', pullNumber: 42 },
    );

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.example.com/project-runs/run%2F1/pull-request',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ githubRepositoryId: '12345', pullNumber: 42 }),
      }),
    );
    expect(capturedHeaders?.get('if-match')).toBe('7');
    expect(capturedHeaders?.get('idempotency-key')).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('sets application/json when posting a JSON body without an explicit content type', async () => {
    let capturedHeaders: Headers | undefined;
    const fetchImplementation = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers as Headers | undefined;
      return Response.json({ ok: true });
    }) as typeof fetch;
    const transport = createApiTransport('https://api.example.com', fetchImplementation);

    await transport.request('/career/target-imports', {
      method: 'POST',
      body: JSON.stringify({ input: { kind: 'FETCHED_URL', url: 'https://example.com/job' } }),
      headers: { 'idempotency-key': '11111111-1111-4111-8111-111111111111' },
    });

    expect(capturedHeaders?.get('content-type')).toBe('application/json');
  });
});
