import { describe, expect, it, vi } from 'vitest';

import { createApiTransport, getProjectRun, projectRunQueryKey } from './index.js';

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
