import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sessionPresentAtom, isAuthInitializedAtom } from '@/lib/auth-atoms';
import { createTestWrapper } from '@/test-utils';

vi.mock('@/api/career', () => ({
  listCareerCompetencies: vi.fn().mockResolvedValue([]),
  listCareerTargets: vi.fn().mockResolvedValue([]),
}));

import { listCareerCompetencies, listCareerTargets } from '@/api/career';
import { useCareerCompetencies, useCareerTargets } from './use-career';

function useInitialCareerQueries() {
  return {
    competencies: useCareerCompetencies(),
    targets: useCareerTargets(),
  };
}

describe('Career query authentication', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not request authenticated data before refresh-session initialization finishes', () => {
    const wrapper = createTestWrapper([
      [sessionPresentAtom, null],
      [isAuthInitializedAtom, false],
    ] as const);

    const { result } = renderHook(useInitialCareerQueries, { wrapper });

    expect(result.current.competencies.fetchStatus).toBe('idle');
    expect(result.current.targets.fetchStatus).toBe('idle');
    expect(listCareerCompetencies).not.toHaveBeenCalled();
    expect(listCareerTargets).not.toHaveBeenCalled();
  });

  it('loads initial Career data after authentication is initialized', async () => {
    const wrapper = createTestWrapper([
      [sessionPresentAtom, true],
      [isAuthInitializedAtom, true],
    ] as const);

    const { result } = renderHook(useInitialCareerQueries, { wrapper });

    await waitFor(() => {
      expect(result.current.competencies.isSuccess).toBe(true);
      expect(result.current.targets.isSuccess).toBe(true);
    });
    expect(listCareerCompetencies).toHaveBeenCalledOnce();
    expect(listCareerTargets).toHaveBeenCalledOnce();
  });
});
