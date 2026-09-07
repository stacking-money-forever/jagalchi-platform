import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

import type { RoadmapListParams } from '@/api/roadmap';
import { isReadOnlyProjectRunRoadmap, listOwnedRoadmaps } from '@/api/roadmap-domain';
import { isAuthenticatedAtom } from '@/lib/auth-atoms';
import { queryKeys } from '@/lib/query-keys';

export function useRoadmaps(params: RoadmapListParams = {}) {
  const authenticated = useAtomValue(isAuthenticatedAtom);
  return useQuery({
    queryKey: [...queryKeys.roadmaps.lists(), params],
    queryFn: () => listOwnedRoadmaps(params),
    enabled: authenticated,
    placeholderData: (previousData) => previousData,
    select: (roadmaps) => {
      const items = roadmaps.items.filter((roadmap) => !isReadOnlyProjectRunRoadmap(roadmap));
      return {
        ...roadmaps,
        items,
        total: Math.max(0, roadmaps.total - (roadmaps.items.length - items.length)),
      };
    },
  });
}
