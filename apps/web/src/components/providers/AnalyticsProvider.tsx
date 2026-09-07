'use client';

import { Suspense, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import { useAtomValue } from 'jotai';

import { capture, reconcilePersistedIdentity } from '@/lib/analytics/client';
import { getPageKey } from '@/lib/analytics/events';
import { currentUserIdAtom, isAuthenticatedAtom, isAuthInitializedAtom } from '@/lib/auth-atoms';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

let lastCapturedPathname: string | null = null;

function AnalyticsObserver() {
  const pathname = usePathname();
  const authInitialized = useAtomValue(isAuthInitializedAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const userId = useAtomValue(currentUserIdAtom);

  useEffect(() => {
    if (!authInitialized || pathname === null) return;

    let cancelled = false;
    const pageKey = getPageKey(pathname);
    const settledUserId = isAuthenticated && userId ? userId : null;
    void reconcilePersistedIdentity(settledUserId).then((ready) => {
      if (cancelled || !ready) return;
      if (pageKey === null) {
        lastCapturedPathname = null;
        return;
      }
      if (lastCapturedPathname === pathname) return;

      if (
        capture('page_viewed', {
          page_key: pageKey,
          auth_state: settledUserId === null ? 'anonymous' : 'authenticated',
        })
      ) {
        lastCapturedPathname = pathname;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authInitialized, isAuthenticated, pathname, userId]);

  return null;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <AnalyticsObserver />
      </Suspense>
    </>
  );
}
