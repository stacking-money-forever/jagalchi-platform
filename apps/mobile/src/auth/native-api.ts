import { clearNativeSession, getNativeRefreshToken, saveNativeSession } from './session-store';

import type { NativeAuthSession } from '@jagalchi/api-client';

const apiOrigin = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

async function authRequest(
  path: string,
  method: 'POST' | 'PATCH',
  body: Record<string, string>,
): Promise<NativeAuthSession> {
  const response = await fetch(`${apiOrigin}/users/auth/native/${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => undefined)) as
    | NativeAuthSession
    | { message?: string }
    | undefined;
  if (!response.ok) {
    throw new Error(payload && 'message' in payload ? payload.message : '인증 요청에 실패했습니다.');
  }
  const session = payload as NativeAuthSession;
  if (!session.accessToken || !session.refreshToken || !session.user?.id) {
    throw new Error('인증 응답이 올바르지 않습니다.');
  }
  await saveNativeSession(session.accessToken, session.refreshToken);
  return session;
}

export function nativeLogin(email: string, password: string): Promise<NativeAuthSession> {
  return authRequest('login', 'POST', { email, password });
}

export async function requestRegistrationVerification(email: string): Promise<void> {
  const response = await fetch(`${apiOrigin}/users/verification`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as
      | { message?: string }
      | undefined;
    throw new Error(payload?.message ?? '인증 코드를 보내지 못했습니다.');
  }
}

export async function verifyRegistrationCode(
  email: string,
  code: string,
): Promise<{ registrationProof: string }> {
  const response = await fetch(`${apiOrigin}/users/verification`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const payload = (await response.json().catch(() => undefined)) as
    | { registrationProof?: string; message?: string }
    | undefined;
  if (!response.ok) throw new Error(payload?.message ?? '인증 코드를 확인하지 못했습니다.');
  if (!payload?.registrationProof) throw new Error('이메일 인증 응답이 올바르지 않습니다.');
  return { registrationProof: payload.registrationProof };
}

export function nativeRegister(input: {
  email: string;
  name: string;
  password: string;
  registrationProof: string;
}): Promise<NativeAuthSession> {
  return authRequest('register', 'POST', input);
}

export async function nativeRefresh(): Promise<NativeAuthSession> {
  const refreshToken = await getNativeRefreshToken();
  if (!refreshToken) throw new Error('로그인이 필요합니다.');
  try {
    return await authRequest('refresh', 'PATCH', { refreshToken });
  } catch (error) {
    await clearNativeSession();
    throw error;
  }
}

export async function nativeLogout(): Promise<void> {
  const refreshToken = await getNativeRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${apiOrigin}/users/auth/native/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    await clearNativeSession();
  }
}
