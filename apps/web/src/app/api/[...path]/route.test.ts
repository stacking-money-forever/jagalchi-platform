import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// fetch는 모듈 로드 전에 stubGlobal 로 설정
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.hoisted(() => {
  process.env.API_ORIGIN = 'https://api.example.com/';
});

import { GET, POST, PUT, PATCH, DELETE } from './route';

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

const TEST_API_ORIGIN = 'https://api.example.com';
function makeRequest(
  method: string,
  pathname: string,
  options: {
    origin?: string;
    csrfCookie?: string;
    csrfHeader?: string;
    extraHeaders?: Record<string, string>;
    body?: string;
    baseUrl?: string;
  } = {},
) {
  const url = new URL(pathname, options.baseUrl ?? 'http://localhost:3000');
  const headers = new Headers();

  if (options.origin) headers.set('origin', options.origin);
  if (options.csrfHeader) headers.set('x-csrf-token', options.csrfHeader);
  if (options.csrfCookie) headers.set('cookie', `csrf-token=${options.csrfCookie}`);
  if (options.extraHeaders) {
    for (const [key, value] of Object.entries(options.extraHeaders)) {
      headers.set(key, value);
    }
  }

  return new NextRequest(url, {
    method,
    headers,
    body: options.body ?? null,
  });
}

function makeOkFetchResponse(status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify({ ok: true }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

const VALID_ORIGIN = 'http://localhost:3000'; // NODE_ENV=test → IS_PRODUCTION=false → 허용
const VALID_CSRF = 'valid-csrf-token-32bytes';

// ---------------------------------------------------------------------------
// GET (safe method) — CSRF 검증 스킵
// ---------------------------------------------------------------------------

describe('GET /api/[...path] (safe method)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReturnValue(makeOkFetchResponse());
  });

  it('Origin 헤더 없이도 정상 프록시된다', async () => {
    const req = makeRequest('GET', '/api/v1/users');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('CSRF 토큰 없이도 정상 프록시된다', async () => {
    const req = makeRequest('GET', '/api/v1/users');
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it('Nest global /api prefix를 유지한 upstream URL로 프록시한다', async () => {
    const req = makeRequest('GET', '/api/users/auth/login');
    await GET(req);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${TEST_API_ORIGIN}/api/users/auth/login`);
  });

  it('Nest prefix와 쿼리스트링을 upstream에 그대로 전달한다', async () => {
    const req = makeRequest('GET', '/api/roadmaps/mine?status=active&page=1&size=10');
    await GET(req);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${TEST_API_ORIGIN}/api/roadmaps/mine?status=active&page=1&size=10`);
  });

  it('upstream 응답 상태코드를 그대로 반환한다', async () => {
    mockFetch.mockReturnValue(makeOkFetchResponse(404));
    const req = makeRequest('GET', '/api/v1/not-found');
    const res = await GET(req);

    expect(res.status).toBe(404);
  });

  it('204 upstream 응답을 null body로 전달한다', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    const req = makeRequest('GET', '/api/health');

    const res = await GET(req);

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// POST — CSRF 검증 필요
// ---------------------------------------------------------------------------

describe('POST /api/[...path] (state-mutating method)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReturnValue(makeOkFetchResponse(201));
  });

  describe('Origin 검증 (1단계)', () => {
    it('Origin 헤더가 없으면 403 CSRF_ORIGIN_MISMATCH를 반환한다', async () => {
      const req = makeRequest('POST', '/api/v1/users', {
        csrfCookie: VALID_CSRF,
        csrfHeader: VALID_CSRF,
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('CSRF_ORIGIN_MISMATCH');
    });

    it('허용되지 않은 Origin이면 403 CSRF_ORIGIN_MISMATCH를 반환한다', async () => {
      const req = makeRequest('POST', '/api/v1/users', {
        origin: 'https://evil.com',
        csrfCookie: VALID_CSRF,
        csrfHeader: VALID_CSRF,
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('CSRF_ORIGIN_MISMATCH');
    });

    it('현재 요청과 같은 동적 Origin이면 허용한다', async () => {
      const origin = 'http://localhost:3100';
      const req = makeRequest('POST', '/api/v1/users', {
        origin,
        baseUrl: origin,
        csrfCookie: VALID_CSRF,
        csrfHeader: VALID_CSRF,
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });

  describe('CSRF 토큰 검증 (2단계)', () => {
    it('CSRF 쿠키가 없으면 403 CSRF_TOKEN_INVALID를 반환한다', async () => {
      const req = makeRequest('POST', '/api/v1/users', {
        origin: VALID_ORIGIN,
        csrfHeader: VALID_CSRF,
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('CSRF 헤더가 없으면 403 CSRF_TOKEN_INVALID를 반환한다', async () => {
      const req = makeRequest('POST', '/api/v1/users', {
        origin: VALID_ORIGIN,
        csrfCookie: VALID_CSRF,
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('CSRF 쿠키와 헤더가 불일치하면 403 CSRF_TOKEN_INVALID를 반환한다', async () => {
      const req = makeRequest('POST', '/api/v1/users', {
        origin: VALID_ORIGIN,
        csrfCookie: 'token-aaa',
        csrfHeader: 'token-bbb',
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('CSRF 쿠키와 헤더가 일치하면 upstream 으로 프록시된다', async () => {
      const req = makeRequest('POST', '/api/v1/users', {
        origin: VALID_ORIGIN,
        csrfCookie: VALID_CSRF,
        csrfHeader: VALID_CSRF,
        body: JSON.stringify({ name: 'test' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });
});

// ---------------------------------------------------------------------------
// PUT / PATCH / DELETE — CSRF 검증 필요 (POST 와 동일 검증 경로)
// ---------------------------------------------------------------------------

describe.each([
  ['PUT', PUT],
  ['PATCH', PATCH],
  ['DELETE', DELETE],
])('%s /api/[...path] CSRF 검증', (method, handler) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReturnValue(makeOkFetchResponse(200));
  });

  it('유효한 Origin + CSRF 토큰으로 정상 프록시된다', async () => {
    const req = makeRequest(method, '/api/v1/resource/1', {
      origin: VALID_ORIGIN,
      csrfCookie: VALID_CSRF,
      csrfHeader: VALID_CSRF,
    });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('Origin 없으면 403 CSRF_ORIGIN_MISMATCH를 반환한다', async () => {
    const req = makeRequest(method, '/api/v1/resource/1', {
      csrfCookie: VALID_CSRF,
      csrfHeader: VALID_CSRF,
    });
    const res = await handler(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('CSRF_ORIGIN_MISMATCH');
  });
});

// ---------------------------------------------------------------------------
// sanitizeRequestHeaders 검증
// ---------------------------------------------------------------------------

describe('sanitizeRequestHeaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReturnValue(makeOkFetchResponse());
  });

  it('x-forwarded-for 헤더가 upstream 에 전달되지 않는다', async () => {
    const req = makeRequest('GET', '/api/v1/test', {
      extraHeaders: { 'x-forwarded-for': '1.2.3.4' },
    });
    await GET(req);

    const [, init] = mockFetch.mock.calls[0] as [string, any];
    const headers = new Headers(init.headers);
    expect(headers.get('x-forwarded-for')).toBeNull();
  });

  it('x-forwarded-host 헤더가 upstream 에 전달되지 않는다', async () => {
    const req = makeRequest('GET', '/api/v1/test', {
      extraHeaders: { 'x-forwarded-host': 'attacker.com' },
    });
    await GET(req);

    const [, init] = mockFetch.mock.calls[0] as [string, any];
    const headers = new Headers(init.headers);
    expect(headers.get('x-forwarded-host')).toBeNull();
  });

  it('x-forwarded-proto 헤더가 upstream 에 전달되지 않는다', async () => {
    const req = makeRequest('GET', '/api/v1/test', {
      extraHeaders: { 'x-forwarded-proto': 'https' },
    });
    await GET(req);

    const [, init] = mockFetch.mock.calls[0] as [string, any];
    const headers = new Headers(init.headers);
    expect(headers.get('x-forwarded-proto')).toBeNull();
  });

  it('host 헤더가 upstream 에 전달되지 않는다', async () => {
    const req = makeRequest('GET', '/api/v1/test', {
      extraHeaders: { host: 'localhost:3000' },
    });
    await GET(req);

    const [, init] = mockFetch.mock.calls[0] as [string, any];
    const headers = new Headers(init.headers);
    expect(headers.get('host')).toBeNull();
  });

  it('x-csrf-token 헤더가 upstream 에 전달되지 않는다 (정상 요청에서도)', async () => {
    const req = makeRequest('POST', '/api/v1/test', {
      origin: VALID_ORIGIN,
      csrfCookie: VALID_CSRF,
      csrfHeader: VALID_CSRF,
    });
    await POST(req);

    const [, init] = mockFetch.mock.calls[0] as [string, any];
    const headers = new Headers(init.headers);
    expect(headers.get('x-csrf-token')).toBeNull();
  });

  it('x-real-ip 헤더가 upstream 에 전달되지 않는다', async () => {
    const req = makeRequest('GET', '/api/v1/test', {
      extraHeaders: { 'x-real-ip': '1.2.3.4' },
    });
    await GET(req);

    const [, init] = mockFetch.mock.calls[0] as [string, any];
    const headers = new Headers(init.headers);
    expect(headers.get('x-real-ip')).toBeNull();
  });
  it('upstream 압축 해제 후 헤더 불일치를 막도록 identity 인코딩을 요청한다', async () => {
    const req = makeRequest('GET', '/api/v1/test', {
      extraHeaders: { 'accept-encoding': 'gzip, deflate, br' },
    });
    await GET(req);

    const [, init] = mockFetch.mock.calls[0] as [string, any];
    const headers = new Headers(init.headers);
    expect(headers.get('accept-encoding')).toBe('identity');
  });

  it('브라우저가 보낸 Authorization과 native 식별자는 제거한다', async () => {
    const req = makeRequest('GET', '/api/v1/test', {
      extraHeaders: {
        authorization: 'Bearer attacker-token',
        'x-jagalchi-client': 'native',
        'x-native-client': '1',
      },
    });
    await GET(req);

    const [, init] = mockFetch.mock.calls[0] as [string, any];
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('x-jagalchi-client')).toBeNull();
    expect(headers.get('x-native-client')).toBeNull();
  });

  it('HttpOnly access cookie만 Nest Bearer로 변환하고 cookie는 전달하지 않는다', async () => {
    const req = makeRequest('GET', '/api/v1/test', {
      extraHeaders: {
        cookie: 'jagalchi_access=trusted-token; jagalchi-session=1',
        authorization: 'Bearer attacker-token',
      },
    });
    await GET(req);

    const [, init] = mockFetch.mock.calls[0] as [string, any];
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer trusted-token');
    expect(headers.get('cookie')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 에러 응답
// ---------------------------------------------------------------------------

describe('에러 응답', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upstream fetch 가 AbortError 를 던지면 504 GATEWAY_TIMEOUT 을 반환한다', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    const req = makeRequest('GET', '/api/v1/slow');
    const res = await GET(req);

    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.code).toBe('GATEWAY_TIMEOUT');
  });

  it('upstream fetch 가 일반 Error 를 던지면 502 BAD_GATEWAY 를 반환한다', async () => {
    mockFetch.mockRejectedValue(new Error('connection refused'));

    const req = makeRequest('GET', '/api/v1/down');
    const res = await GET(req);

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('BAD_GATEWAY');
  });

  it('upstream 404 응답은 그대로 통과된다', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(
        new Response(JSON.stringify({ error: 'not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    const req = makeRequest('GET', '/api/v1/missing');
    const res = await GET(req);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 응답 헤더 정리
// ---------------------------------------------------------------------------

describe('응답 헤더 정리', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upstream 응답의 CORS 헤더가 클라이언트에 노출되지 않는다', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve(
        new Response('ok', {
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-credentials': 'true',
            'access-control-allow-methods': 'GET,POST',
            'access-control-allow-headers': 'Content-Type',
          },
        }),
      ),
    );

    const req = makeRequest('GET', '/api/v1/test');
    const res = await GET(req);

    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    expect(res.headers.get('access-control-allow-methods')).toBeNull();
    expect(res.headers.get('access-control-allow-headers')).toBeNull();
  });

  it('자동 압축 해제된 body와 충돌하는 framing 헤더를 제거하고 cookie는 보존한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'token' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-encoding': 'gzip',
          'content-length': '87',
          'transfer-encoding': 'chunked',
          'set-cookie':
            'jagalchi_refresh=value; Path=/api/users/auth; HttpOnly; Secure; SameSite=Lax',
        },
      }),
    );

    const res = await GET(makeRequest('GET', '/api/v1/test'));

    expect(res.headers.get('content-encoding')).toBeNull();
    expect(res.headers.get('content-length')).toBeNull();
    expect(res.headers.get('transfer-encoding')).toBeNull();
    expect(res.headers.get('set-cookie')).toContain('jagalchi_refresh=');
    await expect(res.json()).resolves.toEqual({ accessToken: 'token' });
  });
});

// ---------------------------------------------------------------------------
// OPTIONS (safe method)
// ---------------------------------------------------------------------------

describe('OPTIONS /api/[...path]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // JSDOM 환경에서 Response 생성자는 204를 지원하지 않으므로 200으로 대체
    mockFetch.mockReturnValue(makeOkFetchResponse(200));
  });

  it('CSRF 검증 없이 프록시된다', async () => {
    const req = makeRequest('OPTIONS', '/api/v1/users');
    const { OPTIONS } = await import('./route');
    const res = await OPTIONS(req);

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
