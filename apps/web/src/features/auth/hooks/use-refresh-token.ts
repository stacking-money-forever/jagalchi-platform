import { useCallback, useEffect, useRef } from 'react';

import { useAtomValue, useSetAtom } from 'jotai';

import { logout, refreshToken } from '@/api/auth';
import {
  beginAuthSessionEnding,
  clearWebSessionPresence,
  completeAuthSessionEnding,
  hasActiveWebSession,
  restoreAuthSessionAfterEnding,
  subscribeToAuthSessionResume,
} from '@/api/client';
import { beginIdentityEnding, finishIdentityEnding } from '@/lib/analytics/client';
import { currentUserIdAtom } from '@/lib/auth-atoms';

import { loginAtom, logoutAtom, isAuthInitializedAtom } from '../stores/auth.atoms';

const REFRESH_INTERVAL_MS = 14 * 60 * 1000;

export function useRefreshToken() {
  const currentUserId = useAtomValue(currentUserIdAtom);
  const setLogin = useSetAtom(loginAtom);
  const setLogout = useSetAtom(logoutAtom);
  const setInitialized = useSetAtom(isAuthInitializedAtom);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRefreshRef = useRef<Promise<boolean | null> | null>(null);
  const generationRef = useRef(0);
  const isMountedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);

  const stopRefresh = useCallback(() => {
    generationRef.current += 1;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearLocalSession = useCallback(() => {
    clearWebSessionPresence();
    if (isMountedRef.current) setLogout();
  }, [setLogout]);

  const refreshSession = useCallback((): Promise<boolean | null> => {
    const generation = generationRef.current;
    const hadSessionAtStart = hasActiveWebSession();
    const request = (async () => {
      try {
        const response = await refreshToken();
        if (!isMountedRef.current || generation !== generationRef.current) return null;

        if ('status' in response) return null;

        setLogin(response);
        return true;
      } catch {
        if (!isMountedRef.current || generation !== generationRef.current) return null;
        if (hasActiveWebSession() !== hadSessionAtStart) return true;

        clearLocalSession();
        stopRefresh();
        return false;
      }
    })();

    activeRefreshRef.current = request;
    void request.finally(() => {
      if (activeRefreshRef.current === request) activeRefreshRef.current = null;
    });
    return request;
  }, [clearLocalSession, setLogin, stopRefresh]);

  const startRefreshInterval = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => void refreshSession(), REFRESH_INTERVAL_MS);
  }, [refreshSession]);

  const beginSessionEnding = useCallback(async () => {
    beginIdentityEnding();
    stopRefresh();
    await beginAuthSessionEnding();
  }, [stopRefresh]);

  const restoreSessionAfterEnding = useCallback(async () => {
    restoreAuthSessionAfterEnding();
    await finishIdentityEnding(currentUserId);
    startRefreshInterval();
  }, [currentUserId, startRefreshInterval]);

  const logoutSession = useCallback(async () => {
    if (logoutPromiseRef.current) return logoutPromiseRef.current;
    const endingUserId = currentUserId;

    const request = (async () => {
      await beginSessionEnding();
      try {
        await logout();
        clearLocalSession();
        await finishIdentityEnding(null);
        completeAuthSessionEnding();
      } catch (error) {
        await finishIdentityEnding(endingUserId);
        restoreAuthSessionAfterEnding();
        if (isMountedRef.current) {
          startRefreshInterval();
        }
        throw error;
      } finally {
        logoutPromiseRef.current = null;
      }
    })();

    logoutPromiseRef.current = request;
    return request;
  }, [beginSessionEnding, clearLocalSession, currentUserId, startRefreshInterval]);

  const clearDeletedSession = useCallback(async () => {
    clearLocalSession();
    await finishIdentityEnding(null);
    completeAuthSessionEnding();
  }, [clearLocalSession]);

  useEffect(() => {
    isMountedRef.current = true;
    const handleRefreshResult = (isSuccess: boolean | null) => {
      if (!isMountedRef.current || isSuccess === null) return;
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        setInitialized(true);
      }
      if (isSuccess) startRefreshInterval();
    };
    const resumeRefresh = () => {
      void refreshSession().then(handleRefreshResult);
    };
    const unsubscribe = subscribeToAuthSessionResume(resumeRefresh);
    resumeRefresh();

    return () => {
      unsubscribe();
      isMountedRef.current = false;
      stopRefresh();
    };
  }, [refreshSession, setInitialized, startRefreshInterval, stopRefresh]);

  useEffect(() => {
    if (!currentUserId || !hasInitializedRef.current) return;
    startRefreshInterval();
  }, [currentUserId, startRefreshInterval]);

  return {
    beginSessionEnding,
    clearDeletedSession,
    logoutSession,
    restoreSessionAfterEnding,
  };
}
