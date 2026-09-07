import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';

import { hasActiveWebSession } from '@/api/client';

import {
  currentUserEmailAtom,
  currentUserIdAtom,
  currentUserNameAtom,
  currentUserPermissionsAtom,
  currentUserRoleAtom,
  isAuthenticatedAtom,
  loginAtom,
  logoutAtom,
} from './auth.atoms';

describe('auth atoms', () => {
  it('initializes current user state from sanitized session and clears it on logout', () => {
    const store = createStore();
    const session = {
      authenticated: true as const,
      user: {
        id: '1',
        email: 'kim@example.com',
        name: '김선배',
        roles: ['STUDENT'],
      },
    };

    store.set(loginAtom, session);

    expect(store.get(isAuthenticatedAtom)).toBe(true);
    expect(hasActiveWebSession()).toBe(true);
    expect(store.get(currentUserEmailAtom)).toBe('kim@example.com');
    expect(store.get(currentUserIdAtom)).toBe('1');
    expect(store.get(currentUserNameAtom)).toBe('김선배');
    expect(store.get(currentUserRoleAtom)).toBe('USER');
    expect(store.get(currentUserPermissionsAtom)).toBe('READ,WRITE');

    store.set(logoutAtom);

    expect(store.get(isAuthenticatedAtom)).toBe(false);
    expect(hasActiveWebSession()).toBe(false);
    expect(store.get(currentUserEmailAtom)).toBeNull();
    expect(store.get(currentUserIdAtom)).toBeNull();
    expect(store.get(currentUserNameAtom)).toBeNull();
    expect(store.get(currentUserRoleAtom)).toBeNull();
    expect(store.get(currentUserPermissionsAtom)).toBeNull();
  });
});
