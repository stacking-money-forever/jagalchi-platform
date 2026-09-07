import { atom } from 'jotai';

import { markWebSessionActive, clearWebSessionPresence } from '@/api/client';
import {
  currentUserEmailAtom,
  currentUserIdAtom,
  currentUserNameAtom,
  currentUserPermissionsAtom,
  currentUserRoleAtom,
  sessionPresentAtom,
} from '@/lib/auth-atoms';
import { normalizeUserRole, permissionsForRole } from '@/lib/jwt';

import type { WebSessionResponse } from '@jagalchi/api-client';

export {
  currentUserEmailAtom,
  currentUserIdAtom,
  currentUserNameAtom,
  currentUserPermissionsAtom,
  currentUserRoleAtom,
  isAuthenticatedAtom,
  isAuthInitializedAtom,
} from '@/lib/auth-atoms';

/** 로그인 시 토큰 저장 + JWT에서 이름 추출 */
export const loginAtom = atom(null, (_get, set, session: WebSessionResponse) => {
  set(sessionPresentAtom, true);
  markWebSessionActive();
  const name = session.user?.name ?? null;
  const email = session.user?.email ?? null;
  const userId = session.user?.id ?? null;
  const tokenRole = session.user?.roles[0] ?? null;
  const userRole = normalizeUserRole(tokenRole);
  const userPermissions = permissionsForRole(tokenRole);
  set(currentUserNameAtom, name);
  set(currentUserEmailAtom, email);
  set(currentUserIdAtom, userId);
  set(currentUserRoleAtom, userRole);
  set(currentUserPermissionsAtom, userPermissions);
});

/** 로그아웃 시 토큰 삭제 + 상태 초기화 */
export const logoutAtom = atom(null, (_get, set) => {
  set(sessionPresentAtom, false);
  set(currentUserNameAtom, null);
  set(currentUserEmailAtom, null);
  set(currentUserIdAtom, null);
  set(currentUserRoleAtom, null);
  set(currentUserPermissionsAtom, null);
  clearWebSessionPresence();
});
