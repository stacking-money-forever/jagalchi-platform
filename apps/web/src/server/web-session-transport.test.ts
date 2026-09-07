import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);
process.env.API_ORIGIN = 'https://api.example.com';

import { endWebSession, establishWebSession } from './web-session-transport';

function request(path: string, method: 'POST' | 'PATCH', cookie = 'csrf-token=trusted') {
  return new NextRequest(`https://jagalchi.dev${path}`, {
    method,
    headers: {
      origin: 'https://jagalchi.dev',
      cookie,
      'x-csrf-token': 'trusted',
      'content-type': 'application/json',
    },
    body: method === 'POST' ? '{}' : undefined,
  });
}

describe('web session transport', () => {
  beforeEach(() => fetchMock.mockReset());

  it('stores tokens in HttpOnly cookies and returns only a sanitized session DTO', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'secret-access-token',
          user: { id: 'user-1', email: 'a@b.com', name: 'A', roles: ['USER'] },
        }),
        {
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'jagalchi_refresh=refresh; Path=/api/users/auth; HttpOnly; SameSite=Lax',
          },
        },
      ),
    );
    const response = await establishWebSession(
      request('/api/users/auth/login', 'POST'),
      '/api/users/auth/login',
      'POST',
    );
    const body = await response.json();
    expect(body).toEqual({
      authenticated: true,
      user: { id: 'user-1', email: 'a@b.com', name: 'A', roles: ['USER'] },
    });
    expect(JSON.stringify(body)).not.toContain('secret-access-token');
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('jagalchi_access=secret-access-token');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie).toContain('jagalchi-session=1');
    expect(setCookie).toContain('Path=/api/users/auth');
  });

  it('clears all local cookies even when upstream revoke fails', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    const response = await endWebSession(
      request('/api/users/auth/logout', 'POST', 'csrf-token=trusted; jagalchi_refresh=refresh'),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      localSessionCleared: true,
      revokeConfirmed: false,
    });
    expect(response.headers.get('set-cookie')).toContain('jagalchi_access=');
    expect(response.headers.get('set-cookie')).toContain('jagalchi_refresh=');
  });

  it('clears access, refresh, and hint cookies after a failed refresh', async () => {
    fetchMock.mockResolvedValue(Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 }));
    const response = await establishWebSession(
      request(
        '/api/users/auth/refresh',
        'PATCH',
        'csrf-token=trusted; jagalchi_refresh=expired; jagalchi_access=stale; jagalchi-session=1',
      ),
      '/api/users/auth/refresh',
      'PATCH',
      true,
    );
    expect(response.status).toBe(401);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('jagalchi_access=');
    expect(setCookie).toContain('jagalchi-session=');
    expect(setCookie).toContain('jagalchi_refresh=');
  });

  it('clears all session cookies when refresh returns a malformed 2xx payload', async () => {
    fetchMock.mockResolvedValue(Response.json({ user: { id: 'user-1' } }));
    const response = await establishWebSession(
      request('/api/users/auth/refresh', 'PATCH', 'csrf-token=trusted; jagalchi_refresh=old'),
      '/api/users/auth/refresh',
      'PATCH',
      true,
    );
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ code: 'INVALID_AUTH_RESPONSE' });
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('jagalchi_access=');
    expect(setCookie).toContain('jagalchi-session=');
    expect(setCookie).toContain('jagalchi_refresh=');
  });

  it('rejects a successful login payload without a complete user', async () => {
    fetchMock.mockResolvedValue(Response.json({ accessToken: 'secret-access-token' }));
    const response = await establishWebSession(
      request('/api/users/auth/login', 'POST'),
      '/api/users/auth/login',
      'POST',
    );
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ code: 'INVALID_AUTH_RESPONSE' });
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
