import { describe, expect, it } from 'vitest';

import {
  buildDiffConfirmPayload,
  buildProfileConfirmPayload,
  listDiffCorrectionLabels,
  listProfileCorrectionLabels,
} from './confirm-payload';
import type { DiffGapView, ProfileFindingView } from './snapshot-payload';

const findings: ProfileFindingView[] = [
  { id: 'f-obs', label: 'TypeScript', status: 'OBSERVED', citationIds: [] },
  { id: 'f-inf', label: 'GraphQL', status: 'INFERRED', citationIds: [] },
];

const gaps: DiffGapView[] = [
  { id: 'g-1', competencyId: 'c-1', description: 'Testing', status: 'MISSING' },
];

describe('confirm payload builders', () => {
  it('builds profile confirm payload with repositories and competency corrections', () => {
    const payload = buildProfileConfirmPayload(findings, {
      acceptedRepositoryIds: ['repo-1'],
      competencyActions: { 'f-inf': 'ACCEPT' },
      competencyNotes: { 'f-inf': 'used in side projects' },
    });

    expect(payload.acceptedRepositoryIds).toEqual(['repo-1']);
    expect(payload.competencyCorrections).toEqual([
      { competencyId: 'f-inf', action: 'ACCEPT', note: 'used in side projects' },
    ]);
  });

  it('lists profile correction labels for review UI', () => {
    const labels = listProfileCorrectionLabels(findings, {
      acceptedRepositoryIds: [],
      competencyActions: { 'f-inf': 'REJECT' },
      competencyNotes: {},
    });
    expect(labels).toEqual(['GraphQL (제외)']);
  });

  it('builds diff confirm payload with accepted competencies and corrections', () => {
    const payload = buildDiffConfirmPayload(gaps, {
      gapStatuses: { 'g-1': 'OBSERVED' },
      gapNotes: { 'g-1': 'covered in coursework' },
    });

    expect(payload.acceptedCompetencyIds).toEqual(['c-1']);
    expect(payload.corrections).toEqual([
      { competencyId: 'c-1', status: 'OBSERVED', note: 'covered in coursework' },
    ]);
    expect(
      listDiffCorrectionLabels(gaps, {
        gapStatuses: { 'g-1': 'OBSERVED' },
        gapNotes: { 'g-1': 'covered in coursework' },
      }),
    ).toEqual(['Testing → OBSERVED (covered in coursework)']);
  });
});
