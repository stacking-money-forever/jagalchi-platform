'use client';

import {
  createApiTransport,
  listProjectRuns,
  type ProjectRunListResponse,
} from '@jagalchi/api-client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

import { createCsrfAwareFetch } from '@/api/client';
import { isAuthenticatedAtom } from '@/lib/auth-atoms';
import { queryKeys } from '@/lib/query-keys';

const transport = createApiTransport('/api', createCsrfAwareFetch());

export function useProjectRuns() {
  const authenticated = useAtomValue(isAuthenticatedAtom);

  return useInfiniteQuery({
    queryKey: queryKeys.projectRuns.lists(),
    queryFn: ({ pageParam, signal }) =>
      listProjectRuns(transport, {
        limit: 20,
        ...(typeof pageParam === 'string' ? { cursor: pageParam } : {}),
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ProjectRunListResponse) => lastPage.nextCursor ?? undefined,
    enabled: authenticated,
    staleTime: 15_000,
  });
}
