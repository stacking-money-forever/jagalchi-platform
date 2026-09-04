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

describe('deriveCurrentPath', () => {
  it('uses currentTaskId as anchor and includes ancestors', () => {
    const path = deriveCurrentPath(
      model({
        currentTaskId: 't2',
        tasks: [
          {
            id: 't1',
            title: '1',
            state: 'DONE',
            required: true,
            milestoneId: 'm1',
            prerequisiteIds: [],
            purpose: '',
            acceptanceCriteria: [],
            evidenceRequirements: [],
            evidenceCount: 0,
            outcome: '',
            citationLabels: [],
            gapLabels: [],
          },
          {
            id: 't2',
            title: '2',
            state: 'IN_PROGRESS',
            required: true,
            milestoneId: 'm1',
            prerequisiteIds: ['t1'],
            purpose: '',
            acceptanceCriteria: [],
            evidenceRequirements: [],
            evidenceCount: 0,
            outcome: '',
            citationLabels: [],
            gapLabels: [],
          },
        ],
      }),
    );
    expect(path).toEqual(expect.arrayContaining(['t1', 't2']));
  });

  it('falls back to recommendedTaskId when current is null', () => {
    const path = deriveCurrentPath(
      model({
        recommendedTaskId: 't1',
        tasks: [
          {
            id: 't1',
            title: '1',
            state: 'READY',
            required: true,
            milestoneId: 'm1',
            prerequisiteIds: [],
            purpose: '',
            acceptanceCriteria: [],
            evidenceRequirements: [],
            evidenceCount: 0,
            outcome: '',
            citationLabels: [],
            gapLabels: [],
          },
        ],
      }),
    );
    expect(path).toEqual(['t1']);
  });
});
