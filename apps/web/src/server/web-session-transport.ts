import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { timingSafeEqual } from 'node:crypto';

import type { WebSessionResponse, WebSessionUser } from '@jagalchi/api-client';

const ACCESS_COOKIE = 'jagalchi_access';
const REFRESH_COOKIE = 'jagalchi_refresh';
const SESSION_HINT_COOKIE = 'jagalchi-session';
const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const AUTH_TIMEOUT_MS = 15_000;

function shouldUseSecureCookies(): boolean {
  return process.env.NEXT_PUBLIC_ENV === 'development'
    ? false
    : process.env.NODE_ENV === 'production';
}

function apiOrigin(): string {
  return new URL(process.env.API_ORIGIN ?? 'http://localhost:8080').origin;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const candidate = new URL(origin).origin;
    const configuredSite = process.env.NEXT_PUBLIC_SITE_URL;
    const configuredOrigin = configuredSite ? new URL(configuredSite).origin : undefined;
    return candidate === request.nextUrl.origin || candidate === configuredOrigin;
  } catch {
    return false;
  }
}

function validCsrf(request: NextRequest): boolean {
  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  const header = request.headers.get(CSRF_HEADER);
  if (!cookie || !header) return false;
  const left = Buffer.from(cookie);
  const right = Buffer.from(header);
  return left.length === right.length && timingSafeEqual(left, right);
}

function clearWebSession(response: NextResponse): void {
  const secure = shouldUseSecureCookies();
  response.cookies.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(SESSION_HINT_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: 'lax',
    path: '/api/users/auth',
    maxAge: 0,
  });
}

function setWebSession(response: NextResponse, accessToken: string): void {
  const secure = shouldUseSecureCookies();
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60,
  });
  response.cookies.set(SESSION_HINT_COOKIE, '1', {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}

function forwardRefreshCookie(upstream: Response, response: NextResponse): void {
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie?.startsWith(`${REFRESH_COOKIE}=`)) response.headers.append('set-cookie', setCookie);
}

function webSessionBody(payload: unknown): WebSessionResponse | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  if (typeof record.accessToken !== 'string' || record.accessToken.length === 0) return undefined;
  const user = record.user ?? record;
  if (!user || typeof user !== 'object') return undefined;
  const candidate = user as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.email !== 'string' ||
    typeof candidate.name !== 'string' ||
    !Array.isArray(candidate.roles) ||
    candidate.roles.some((role) => typeof role !== 'string')
  ) {
    return undefined;
  }
  return {
    authenticated: true,
    user: {
      id: candidate.id,
      email: candidate.email,
      name: candidate.name,
      roles: candidate.roles,
    } satisfies WebSessionUser,
  };
}

export async function establishWebSession(
  request: NextRequest,
  upstreamPath: string,
  method: 'POST' | 'PATCH',
  clearOnFailure = false,
): Promise<NextResponse> {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { code: 'CSRF_ORIGIN_MISMATCH', message: 'Request origin is not trusted' },
      { status: 403 },
    );
  }
  if (!validCsrf(request)) {
    return NextResponse.json(
      { code: 'CSRF_TOKEN_INVALID', message: 'Request is not trusted' },
      { status: 403 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const headers = new Headers({
      'content-type': request.headers.get('content-type') ?? 'application/json',
    });
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refresh) headers.set('cookie', `${REFRESH_COOKIE}=${encodeURIComponent(refresh)}`);
    const upstream = await fetch(`${apiOrigin()}${upstreamPath}`, {
      method,
      headers,
      body: method === 'POST' ? await request.text() : undefined,
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = await upstream.json().catch(() => undefined);
    if (!upstream.ok) {
      const response = NextResponse.json(payload ?? { code: 'AUTH_FAILED' }, {
        status: upstream.status,
      });
      const retryAfter = upstream.headers.get('retry-after');
      if (retryAfter) response.headers.set('retry-after', retryAfter);
      if (clearOnFailure) {
        clearWebSession(response);
        clearRefreshCookie(response);
      }
      return response;
    }
    const session = webSessionBody(payload);
    if (!session) {
      const response = NextResponse.json({ code: 'INVALID_AUTH_RESPONSE' }, { status: 502 });
      if (clearOnFailure) {
        clearWebSession(response);
        clearRefreshCookie(response);
      }
      return response;
    }
    const response = NextResponse.json(session, { status: upstream.status });
    setWebSession(response, (payload as { accessToken: string }).accessToken);
    forwardRefreshCookie(upstream, response);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        code:
          error instanceof Error && error.name === 'AbortError' ? 'GATEWAY_TIMEOUT' : 'BAD_GATEWAY',
      },
      { status: error instanceof Error && error.name === 'AbortError' ? 504 : 502 },
    );
    if (clearOnFailure) {
      clearWebSession(response);
      clearRefreshCookie(response);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function endWebSession(request: NextRequest): Promise<NextResponse> {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { code: 'CSRF_ORIGIN_MISMATCH', message: 'Request origin is not trusted' },
      { status: 403 },
    );
  }
  if (!validCsrf(request)) {
    return NextResponse.json(
      { code: 'CSRF_TOKEN_INVALID', message: 'Request is not trusted' },
      { status: 403 },
    );
  }
  const headers = new Headers();
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refresh) headers.set('cookie', `${REFRESH_COOKIE}=${encodeURIComponent(refresh)}`);
  let upstream: Response;
  try {
    upstream = await fetch(`${apiOrigin()}/api/users/auth/logout`, {
      method: 'POST',
      headers,
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    const response = NextResponse.json({ localSessionCleared: true, revokeConfirmed: false });
    clearWebSession(response);
    clearRefreshCookie(response);
    return response;
  }
  const response = NextResponse.json({
    localSessionCleared: true,
    revokeConfirmed: upstream.ok,
  });
  clearWebSession(response);
  if (upstream.ok) forwardRefreshCookie(upstream, response);
  else clearRefreshCookie(response);
  return response;
}
