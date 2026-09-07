import { atom } from 'jotai';

/** HttpOnly 웹 세션이 확인됐는지 나타내는 UI 상태. 비밀값을 포함하지 않는다. */
export const sessionPresentAtom = atom<boolean>(false);

/** 현재 로그인한 사용자 이름 — JWT payload에서 추출 */
export const currentUserNameAtom = atom<string | null>(null);

/** 현재 로그인한 사용자 이메일 — JWT payload에서 추출 */
export const currentUserEmailAtom = atom<string | null>(null);

/** 현재 로그인한 사용자 ID — JWT payload의 id claim 우선, sub fallback */
export const currentUserIdAtom = atom<string | null>(null);

/** 현재 로그인한 사용자의 제품 역할 */
export const currentUserRoleAtom = atom<string | null>(null);

/** 현재 로그인한 사용자의 UI 권한 */
export const currentUserPermissionsAtom = atom<string | null>(null);

/** refresh 세션 확인이 끝났는지 표시 */
export const isAuthInitializedAtom = atom<boolean>(false);

/** 현재 로그인 상태 (토큰 존재 여부 기반) */
export const isAuthenticatedAtom = atom<boolean>((get) => {
  return get(sessionPresentAtom);
});
