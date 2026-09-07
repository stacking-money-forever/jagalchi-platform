import type { DiffGapView, ProfileFindingView } from './snapshot-payload';
import type { ConfirmCareerDiffDto, ConfirmProfileSnapshotDto } from '@jagalchi/api-client';

export type CompetencyAction = 'ACCEPT' | 'REJECT';

export interface ProfileReviewDraft {
  acceptedRepositoryIds: string[];
  competencyActions: Record<string, CompetencyAction | undefined>;
  competencyNotes: Record<string, string>;
}

export interface DiffReviewDraft {
  gapStatuses: Record<string, DiffGapView['status']>;
  gapNotes: Record<string, string>;
}

export function buildProfileConfirmPayload(
  findings: ProfileFindingView[],
  draft: ProfileReviewDraft,
): ConfirmProfileSnapshotDto {
  const competencyCorrections = findings
    .filter((finding) => finding.status === 'INFERRED')
    .map((finding) => {
      const action = draft.competencyActions[finding.id];
      if (!action) return null;
      const note = draft.competencyNotes[finding.id]?.trim();
      return {
        competencyId: finding.id,
        action,
        ...(note ? { note } : {}),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const payload: ConfirmProfileSnapshotDto = {};
  if (draft.acceptedRepositoryIds.length > 0) {
    payload.acceptedRepositoryIds = [...draft.acceptedRepositoryIds];
  }
  if (competencyCorrections.length > 0) {
    payload.competencyCorrections = competencyCorrections;
  }
  return payload;
}

export function buildDiffConfirmPayload(
  gaps: DiffGapView[],
  draft: DiffReviewDraft,
): ConfirmCareerDiffDto {
  const corrections = gaps
    .map((gap) => {
      const nextStatus = draft.gapStatuses[gap.id] ?? gap.status;
      const note = draft.gapNotes[gap.id]?.trim();
      if (nextStatus === gap.status && !note) return null;
      return {
        competencyId: gap.competencyId,
        status: nextStatus,
        ...(note ? { note } : {}),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const acceptedCompetencyIds = gaps
    .filter((gap) => (draft.gapStatuses[gap.id] ?? gap.status) !== 'MISSING')
    .map((gap) => gap.competencyId);

  const payload: ConfirmCareerDiffDto = {};
  if (acceptedCompetencyIds.length > 0) {
    payload.acceptedCompetencyIds = acceptedCompetencyIds;
  }
  if (corrections.length > 0) {
    payload.corrections = corrections;
  }
  return payload;
}

export function listProfileCorrectionLabels(
  findings: ProfileFindingView[],
  draft: ProfileReviewDraft,
): string[] {
  return findings
    .filter((finding) => {
      const action = draft.competencyActions[finding.id];
      const note = draft.competencyNotes[finding.id]?.trim();
      return Boolean(action || note);
    })
    .map((finding) => {
      const action = draft.competencyActions[finding.id];
      const note = draft.competencyNotes[finding.id]?.trim();
      const actionLabel = action === 'REJECT' ? '제외' : action === 'ACCEPT' ? '수락' : '메모';
      return note
        ? `${finding.label} (${actionLabel}: ${note})`
        : `${finding.label} (${actionLabel})`;
    });
}

export function listDiffCorrectionLabels(gaps: DiffGapView[], draft: DiffReviewDraft): string[] {
  return gaps
    .filter((gap) => {
      const nextStatus = draft.gapStatuses[gap.id] ?? gap.status;
      const note = draft.gapNotes[gap.id]?.trim();
      return nextStatus !== gap.status || Boolean(note);
    })
    .map((gap) => {
      const nextStatus = draft.gapStatuses[gap.id] ?? gap.status;
      const note = draft.gapNotes[gap.id]?.trim();
      return note
        ? `${gap.description} → ${nextStatus} (${note})`
        : `${gap.description} → ${nextStatus}`;
    });
}
