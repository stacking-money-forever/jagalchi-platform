'use client';

import { useMemo } from 'react';

import { adaptProjectRunProjection, deriveCurrentPath } from '../projection';

import type { ProjectRunProjection } from '@jagalchi/api-client';

export function useProjectRunProjection(run: ProjectRunProjection) {
  const model = useMemo(() => adaptProjectRunProjection(run), [run]);
  const pathTaskIds = useMemo(() => deriveCurrentPath(model), [model]);
  return { model, pathTaskIds };
}
