import { describe, expect, it } from 'vitest';

import { deriveCurrentPath } from './derive-current-path';
import type { RoadmapGraphModel } from './types';

function model(partial: Partial<RoadmapGraphModel>): RoadmapGraphModel {
  return {
    runId: 'r',
    runState: 'ACTIVE',
    currentTaskId: null,
    recommendedTaskId: null,
    milestones: [{ id: 'm1', title: '단계 1' }],
    tasks: [],
    proof: null,
    ...partial,
  };
}

const taskBase = {
  required: true,
  milestoneId: 'm1',
  purpose: '',
  acceptanceCriteria: [],
  evidenceRequirements: [],
  evidenceCount: 0,
  outcome: '',
  citationLabels: [],
  gapLabels: [],
};

describe('deriveCurrentPath', () => {
  it('uses currentTaskId as anchor and includes ancestors', () => {
    const path = deriveCurrentPath(
      model({
        currentTaskId: 't2',
        recommendedTaskId: 'rec-1',
        tasks: [
          { id: 't1', title: '1', state: 'DONE', prerequisiteIds: [], ...taskBase },
          {
            id: 't2',
            title: '2',
            state: 'IN_PROGRESS',
            prerequisiteIds: ['t1'],
            ...taskBase,
          },
        ],
      }),
    );
    expect(path).toEqual(expect.arrayContaining(['t1', 't2']));
  });

  it('falls back to recommendedTaskId when current is null (G2 UI source)', () => {
    const path = deriveCurrentPath(
      model({
        recommendedTaskId: 'rec-1',
        tasks: [{ id: 'rec-1', title: '1', state: 'READY', prerequisiteIds: [], ...taskBase }],
      }),
    );
    expect(path).toEqual(['rec-1']);
  });
});
