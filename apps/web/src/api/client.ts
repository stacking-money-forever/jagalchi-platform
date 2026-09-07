import type { WebSessionResponse } from '@jagalchi/api-client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

/** cross-origin API일 때만 credentials: include (프록시 환경에선 same-origin) */
const CREDENTIALS = (
  BASE_URL.startsWith('http') ? 'include' : 'same-origin'
) as globalThis.RequestCredentials;

/** 프록시를 통해 요청할 때만 CSRF 검증이 필요하다 */
const IS_PROXY_MODE = !BASE_URL.startsWith('http');

const SAFE_METHODS_SET = new Set(['GET', 'HEAD', 'OPTIONS']);

// --- CSRF Token (in-memory cache, proxy mode only) ---

const CSRF_CACHE_TTL_MS = 90 * 60 * 1000; // 90분 (쿠키 maxAge 2시간보다 짧게)

let csrfToken: string | null = null;
let csrfTokenExpiresAt = 0;
let csrfFetchPromise: Promise<string | null> | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (!IS_PROXY_MODE) return null;
  if (csrfToken && Date.now() < csrfTokenExpiresAt) return csrfToken;

  // 이미 진행 중인 fetch가 있으면 공유 (thundering herd 방지)
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = (async () => {
    try {
      const response = await fetch('/api/csrf-token', { credentials: 'same-origin' });
      if (!response.ok) return null;
      const data = (await response.json()) as { token: string };
      csrfToken = data.token;
      csrfTokenExpiresAt = Date.now() + CSRF_CACHE_TTL_MS;
      return csrfToken;
    } catch {
      return null;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}

/** CSRF 토큰 캐시를 초기화한다 (로그아웃 등 세션 전환 시 호출). */
export function resetCsrfToken(): void {
  csrfToken = null;
  csrfTokenExpiresAt = 0;
}

/** Proxy-mode browser fetch that mirrors apiClient CSRF handling for createApiTransport callers. */
export function createCsrfAwareFetch(fetchImplementation: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const credentials = init?.credentials ?? CREDENTIALS;

    if (!IS_PROXY_MODE || SAFE_METHODS_SET.has(method)) {
      return fetchImplementation(input, { ...init, credentials });
    }

    const attachCsrf = async (token: string | null) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set('X-CSRF-Token', token);
      return fetchImplementation(input, { ...init, credentials, headers });
    };

    let response = await attachCsrf(await getCsrfToken());

    if (response.status === 403) {
      const error = (await response
        .clone()
        .json()
        .catch(() => undefined)) as { code?: unknown } | undefined;
      if (error?.code === 'CSRF_TOKEN_INVALID') {
        resetCsrfToken();
        response = await attachCsrf(await getCsrfToken());
      }
    }

    return response;
  };
}

export const SESSION_COOKIE_KEY = 'jagalchi-session';

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor({ message, status, code }: ApiError) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

// --- Session presence (the browser never receives an access token) ---

let hasWebSession = false;
let isRefreshing = false;
let refreshPromise: Promise<RefreshResult> | null = null;
let refreshEpoch = 0;
let sessionEnding = false;
let refreshAbortController: AbortController | null = null;
const sessionEndingListeners = new Set<() => void>();

export type RefreshResult =
  | { status: 'refreshed'; session: WebSessionResponse }
  | { status: 'session-ending' }
  | { status: 'expired' };

export function beginAuthSessionEnding(): Promise<void> {
  sessionEnding = true;
  refreshEpoch += 1;
  refreshAbortController?.abort();
  return Promise.resolve();
}

export function restoreAuthSessionAfterEnding(): void {
  sessionEnding = false;
  sessionEndingListeners.forEach((listener) => listener());
}

/** 정상적인 세션 종료 뒤 래치만 해제한다. 새 세션이 생기기 전 refresh는 재시도하지 않는다. */
export function completeAuthSessionEnding(): void {
  sessionEnding = false;
}

export function subscribeToAuthSessionResume(listener: () => void): () => void {
  sessionEndingListeners.add(listener);
  return () => sessionEndingListeners.delete(listener);
}

export function hasActiveWebSession(): boolean {
  return hasWebSession;
}

export function markWebSessionActive(): void {
  hasWebSession = true;
}

/** HttpOnly 쿠키는 auth route handler가 삭제하며 여기서는 UI 상태만 비운다. */
export function clearWebSessionPresence(): void {
  hasWebSession = false;
  resetCsrfToken();
}

/** 인증 엔드포인트 여부 (401 시 refresh 스킵) */
const isAuthEndpoint = (endpoint: string): boolean =>
  endpoint.includes('/users/auth/') ||
  endpoint === '/users' ||
  endpoint.includes('/users/verification');

/** 리프레시 토큰으로 새 액세스 토큰 획득 */
export async function refreshAccessToken(): Promise<RefreshResult> {
  if (sessionEnding) return { status: 'session-ending' };

  // 이미 리프레시 중이면 같은 Promise 공유 (중복 요청 방지)
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  const requestEpoch = refreshEpoch;
  const abortController = new AbortController();
  refreshAbortController = abortController;
  refreshPromise = (async () => {
    try {
      const csrfHeader: Record<string, string> = {};
      const csrf = await getCsrfToken();
      if (csrf) csrfHeader['X-CSRF-Token'] = csrf;
      if (sessionEnding || requestEpoch !== refreshEpoch) {
        return { status: 'session-ending' };
      }

      const url = `${BASE_URL}/users/auth/refresh`;
      const response = await fetch(url, {
        method: 'PATCH',
        credentials: CREDENTIALS, // httpOnly 리프레시 쿠키 자동 전송
        headers: { 'Content-Type': 'application/json', ...csrfHeader },
        signal: abortController.signal,
      });

      if (!response.ok) return { status: 'expired' };

      const session = (await response.json()) as WebSessionResponse;
      if (sessionEnding || requestEpoch !== refreshEpoch) {
        return { status: 'session-ending' };
      }
      markWebSessionActive();
      return { status: 'refreshed', session };
    } catch {
      return sessionEnding || requestEpoch !== refreshEpoch
        ? { status: 'session-ending' }
        : { status: 'expired' };
    } finally {
      isRefreshing = false;
      refreshPromise = null;
      if (refreshAbortController === abortController) refreshAbortController = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  init: {
    method: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const csrfHeader: Record<string, string> = {};
  if (!SAFE_METHODS_SET.has(init.method)) {
    const csrf = await getCsrfToken();
    if (csrf) csrfHeader['X-CSRF-Token'] = csrf;
  }

  let response = await fetch(url, {
    ...init,
    credentials: CREDENTIALS,
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeader,
      ...init.headers,
    },
  });

  if (response.status === 403 && IS_PROXY_MODE && !SAFE_METHODS_SET.has(init.method)) {
    const error = (await response
      .clone()
      .json()
      .catch(() => undefined)) as { code?: unknown } | undefined;
    if (error?.code === 'CSRF_TOKEN_INVALID') {
      resetCsrfToken();
      const renewedCsrf = await getCsrfToken();
      if (renewedCsrf) {
        response = await fetch(url, {
          ...init,
          credentials: CREDENTIALS,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': renewedCsrf,
            ...init.headers,
          },
        });
      }
    }
  }

  if (!response.ok) {
    // 401 + 비인증 엔드포인트 → refresh 시도 후 재요청
    if (response.status === 401 && !isAuthEndpoint(endpoint)) {
      const refreshResult = await refreshAccessToken();

      if (refreshResult.status === 'refreshed') {
        // 새 토큰으로 원래 요청 재시도
        const retryResponse = await fetch(url, {
          ...init,
          credentials: CREDENTIALS,
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeader,
            ...init.headers,
          },
        });

        if (retryResponse.ok) {
          if (retryResponse.status === 204) return undefined as T;
          const retryText = await retryResponse.text();
          if (!retryText) return undefined as T;
          return JSON.parse(retryText) as T;
        }
      }

      if (refreshResult.status === 'session-ending') {
        throw new ApiClientError({
          message: '세션 종료 중입니다',
          status: 401,
          code: 'SESSION_ENDING',
        });
      }

      // refresh 실패 → 토큰 클리어 (보호 라우트에서만 리다이렉트)
      clearWebSessionPresence();
      const isProtectedRoute =
        typeof window !== 'undefined' &&
        ['/career', '/myroadmap', '/profile', '/editor', '/projects'].some((route) =>
          window.location.pathname.startsWith(route),
        );
      if (isProtectedRoute) {
        window.location.replace(new URL('/login', window.location.origin).href);
      }
      throw new ApiClientError({
        message: '인증이 만료되었습니다',
        status: 401,
        code: 'AUTH_REQUIRED',
      });
    }

    const errorBody = (await response.json().catch(() => ({
      message: '알 수 없는 오류가 발생했습니다',
    }))) as { message: string; code?: string };

    throw new ApiClientError({
      message: errorBody.message,
      status: response.status,
      code: errorBody.code,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export { ApiClientError };
