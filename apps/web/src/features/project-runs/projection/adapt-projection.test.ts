import { describe, expect, it } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { adaptProjectRunProjection } from './adapt-projection';

const baseRun = {
  id: 'run-1',
  state: 'ACTIVE',
  version: 2,
  currentTaskId: 't2',
  recommendedTaskId: 't2',
  plan: { id: 'plan-1', schemaVersion: 1 },
  map: {
    nodes: [
      { id: 't1', title: 'A', milestoneId: 'm1', state: 'DONE' },
      { id: 't2', title: 'B', milestoneId: 'm1', state: 'READY' },
    ],
    edges: [{ id: 'e1', source: 't1', target: 't2', kind: 'PREREQUISITE' }],
  },
  tasks: [
    {
      id: 't1',
      title: 'A',
      state: 'DONE',
      required: true,
      milestoneId: 'm1',
      prerequisiteIds: [],
      purpose: 'p1',
      acceptanceCriteria: ['ac1'],
      evidenceRequirements: ['PR'],
      citationIds: ['c1'],
      gapIds: ['g1'],
    },
    {
      id: 't2',
      title: 'B',
      state: 'READY',
      required: true,
      milestoneId: 'm1',
      prerequisiteIds: ['t1'],
      purpose: 'p2',
      acceptanceCriteria: ['ac2'],
      evidenceRequirements: ['PR', 'CHANGED_PATH:src'],
      verificationFailure: { code: 'RULE_FAIL', note: 'missing path' },
    },
  ],
  citations: [{ id: 'c1', label: 'Req label', quote: 'quote' }],
  gaps: [{ id: 'g1', description: 'Gap desc' }],
  proof: {
    summary: 'summary',
    validUntil: null,
    publication: { state: 'UNPUBLISHED', publicId: null },
    verification: { state: 'PENDING', verifiedAt: null },
    facts: {
      snapshotId: 'snap-1',
      verificationLevel: 'MACHINE_VERIFIED',
      provider: 'fixture',
      repositoryId: 'repo-1',
      pullNumber: 1,
      headSha: 'abc',
      observedAt: '2026-01-01T00:00:00.000Z',
      evaluations: [{ ruleId: 'rule-0', type: 'MERGED_PR', passed: true, code: 'OK' }],
    },
  },
} satisfies ProjectRunProjection;

describe('adaptProjectRunProjection', () => {
  it('maps milestones, citations, gaps, and verification failure', () => {
    const model = adaptProjectRunProjection(baseRun);
    expect(model.milestones).toEqual([{ id: 'm1', title: '단계 1' }]);
    expect(model.tasks[0]?.citationLabels).toEqual(['Req label']);
    expect(model.tasks[0]?.gapLabels).toEqual(['Gap desc']);
    expect(model.tasks[1]?.blockedReason).toBe('missing path');
    expect(model.tasks[1]?.evidenceCount).toBe(1);
    expect(model.proof?.verification).toBe('PENDING');
  });
});
