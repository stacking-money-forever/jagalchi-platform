import { beforeEach, describe, expect, it, vi } from 'vitest';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('api client session ending', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('aborts an in-flight 401 refresh and ignores its late access token', async () => {
    const refresh = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'expired' }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'csrf-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockImplementationOnce(() => refresh.promise);
    vi.stubGlobal('fetch', fetchMock);

    const client = await import('./client');
    const request = client.apiClient.get('/roadmaps').catch((error: unknown) => error);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    await client.beginAuthSessionEnding();
    refresh.resolve(
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await request;

    expect(client.hasActiveWebSession()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('preserves the active token when rollback precedes an invalidated refresh result', async () => {
    const refresh = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'expired' }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'csrf-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockImplementationOnce(() => refresh.promise);
    vi.stubGlobal('fetch', fetchMock);

    const client = await import('./client');
    client.markWebSessionActive();
    const request = client.apiClient.get('/roadmaps').catch((error: unknown) => error);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    await client.beginAuthSessionEnding();
    client.restoreAuthSessionAfterEnding();
    refresh.resolve(
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(request).resolves.toMatchObject({ code: 'SESSION_ENDING' });
    expect(client.hasActiveWebSession()).toBe(true);
  });

  it('does not start a refresh when a protected request receives 401 after ending begins', async () => {
    const initialRequest = deferred<Response>();
    const fetchMock = vi.fn<typeof fetch>().mockImplementationOnce(() => initialRequest.promise);
    vi.stubGlobal('fetch', fetchMock);

    const client = await import('./client');
    client.markWebSessionActive();
    const request = client.apiClient.get('/roadmaps').catch((error: unknown) => error);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await client.beginAuthSessionEnding();

    initialRequest.resolve(
      new Response(JSON.stringify({ message: 'expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await request;

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(client.hasActiveWebSession()).toBe(true);
  });

  it('allows refresh again only after an explicit session restore', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'expired' }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'csrf-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = await import('./client');
    await client.beginAuthSessionEnding();
    client.restoreAuthSessionAfterEnding();
    await expect(client.apiClient.get('/roadmaps')).resolves.toEqual({ ok: true });
    expect(client.hasActiveWebSession()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('unlatches a completed logout without triggering an immediate refresh', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'csrf-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = await import('./client');
    await client.beginAuthSessionEnding();
    client.completeAuthSessionEnding();

    expect(await client.refreshAccessToken()).toEqual({ status: 'expired' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares a hook refresh with a concurrent 401 refresh', async () => {
    const refresh = deferred<Response>();
    let roadmapRequests = 0;
    const fetchMock = vi.fn<typeof fetch>((input) => {
      const url = String(input);
      if (url === '/api/csrf-token') {
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'csrf-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.endsWith('/users/auth/refresh')) return refresh.promise;
      roadmapRequests += 1;
      if (roadmapRequests === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = await import('./client');
    const auth = await import('./auth');
    const hookRefresh = auth.refreshToken();
    const request = client.apiClient.get('/roadmaps');

    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/users/auth/refresh')),
      ).toHaveLength(1),
    );
    refresh.resolve(
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(hookRefresh).resolves.toEqual({ authenticated: true });
    await expect(request).resolves.toEqual({ ok: true });
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/users/auth/refresh')),
    ).toHaveLength(1);
  });

  it('sends a CSRF token when refresh falls back through the proxy', async () => {
    let roadmapRequests = 0;
    const fetchMock = vi.fn<typeof fetch>((input, init) => {
      const url = String(input);
      if (url === '/api/csrf-token') {
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'csrf-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.endsWith('/users/auth/refresh')) {
        expect(init?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-token' });
        return Promise.resolve(
          new Response(JSON.stringify({ authenticated: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      roadmapRequests += 1;
      if (roadmapRequests === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = await import('./client');

    await expect(client.apiClient.get('/roadmaps')).resolves.toEqual({ ok: true });
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/users/auth/refresh')),
    ).toHaveLength(1);
  });

  it('renews a raced CSRF token and retries a mutation exactly once', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'stale' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'CSRF_TOKEN_INVALID' }), { status: 403 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'current' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = await import('./client');
    await expect(client.apiClient.post('/users/auth/login', { email: 'a@b.com' })).resolves.toEqual(
      { ok: true },
    );

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ 'X-CSRF-Token': 'stale' });
    expect(fetchMock.mock.calls[3]?.[1]?.headers).toMatchObject({ 'X-CSRF-Token': 'current' });
  });

  it('createCsrfAwareFetch attaches CSRF headers to mutating requests', async () => {
    const fetchMock = vi.fn<typeof fetch>((input, _init) => {
      const url = String(input);
      if (url === '/api/csrf-token') {
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'csrf-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ id: 'import-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = await import('./client');
    const csrfFetch = client.createCsrfAwareFetch(fetchMock);
    await csrfFetch('/api/career/target-imports', { method: 'POST', body: '{}' });

    const mutationHeaders = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/career/target-imports'),
    )?.[1]?.headers;
    expect(mutationHeaders).toBeInstanceOf(Headers);
    expect((mutationHeaders as Headers).get('X-CSRF-Token')).toBe('csrf-token');
  });
});
