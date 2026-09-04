import { describe, expect, it } from 'vitest';

import type { ProjectProposalRecord } from '@jagalchi/api-client';

import { assertThreeProposals, buildProposalComparisons } from './proposal-presenter';

const proposals = (count: number): ProjectProposalRecord[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `p-${index + 1}`,
    proposalSetId: 'set-1',
    blueprintVersionId: `bp-${index + 1}`,
    rank: index + 1,
    payload: {
      title: `Proposal ${index + 1}`,
      repositoryMode: 'EXISTING_OWNED',
      citationIds: ['req-1'],
      citedGapIds: ['gap-1'],
      boundedOutcome: 'ship feature',
      nonGoals: ['rewrite'],
      durationHours: 12,
      difficulty: 'MEDIUM',
      evidenceRules: ['PR merged'],
      confidence: 0.8,
      rejectionReasons: ['longer timeline'],
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  }));

describe('proposal presenter', () => {
  it('requires exactly three proposals', () => {
    expect(() => assertThreeProposals(proposals(2))).toThrow('EXPECTED_THREE_PROPOSALS:2');
    expect(assertThreeProposals(proposals(3)).map((item) => item.rank)).toEqual([1, 2, 3]);
  });

  it('builds comparison dimensions including tradeoffs from rejectionReasons', () => {
    const views = buildProposalComparisons(
      proposals(3),
      [{ id: 'req-1', label: 'API design' }],
      [{ id: 'gap-1', competencyId: 'c-1', description: 'Testing', status: 'MISSING' }],
    );

    expect(views).toHaveLength(3);
    expect(views[0]?.citedRequirements[0]?.label).toBe('API design');
    expect(views[0]?.tradeoffs).toEqual(['longer timeline']);
    expect(views[0]?.difficulty).toBe('보통');
  });
});
