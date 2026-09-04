import type { CitationView, DiffGapView } from './snapshot-payload';
import type {
  ProjectProposalPayload,
  ProjectProposalRecord,
  RepositoryMode,
} from '@jagalchi/api-client';

export interface ProposalComparisonView {
  id: string;
  rank: number;
  title: string;
  repositoryMode: RepositoryMode;
  citedRequirements: Array<{ id: string; label: string; quote?: string }>;
  citedGaps: Array<{ id: string; description: string }>;
  boundedOutcome: string;
  nonGoals: string[];
  durationHours: number | null;
  difficulty: string;
  evidenceRules: string[];
  confidence: number | null;
  tradeoffs: string[];
}

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
};

const REPOSITORY_MODE_LABEL: Record<RepositoryMode, string> = {
  EXISTING_OWNED: '기존 저장소',
  OPEN_SOURCE_CONTRIBUTION: '오픈소스 기여',
  MANUAL_GREENFIELD: '신규 프로젝트',
};

export function repositoryModeLabel(mode: RepositoryMode): string {
  return REPOSITORY_MODE_LABEL[mode] ?? mode;
}

export function difficultyLabel(value?: string): string {
  if (!value) return '미정';
  return DIFFICULTY_LABEL[value] ?? value;
}

export function assertThreeProposals(proposals: ProjectProposalRecord[]): ProjectProposalRecord[] {
  const sorted = [...proposals].sort((a, b) => a.rank - b.rank);
  if (sorted.length !== 3) {
    throw new Error(`EXPECTED_THREE_PROPOSALS:${sorted.length}`);
  }
  return sorted;
}

export function buildProposalComparisons(
  proposals: ProjectProposalRecord[],
  citations: CitationView[],
  gaps: DiffGapView[],
): ProposalComparisonView[] {
  const ordered = assertThreeProposals(proposals);
  const citationById = new Map(citations.map((item) => [item.id, item]));
  const gapById = new Map(gaps.map((item) => [item.id, item]));

  return ordered.map((proposal) => {
    const payload = proposal.payload as ProjectProposalPayload;
    const citationIds = Array.isArray(payload.citationIds) ? payload.citationIds : [];
    const gapIds = Array.isArray(payload.citedGapIds) ? payload.citedGapIds : [];
    return {
      id: proposal.id,
      rank: proposal.rank,
      title: payload.title ?? `제안 ${proposal.rank}`,
      repositoryMode: payload.repositoryMode ?? 'EXISTING_OWNED',
      citedRequirements: citationIds.map((id: string) => {
        const citation = citationById.get(id);
        return citation ?? { id, label: id };
      }),
      citedGaps: gapIds.map((id: string) => {
        const gap = gapById.get(id);
        return gap ? { id, description: gap.description } : { id, description: id };
      }),
      boundedOutcome: payload.boundedOutcome ?? '성과 범위가 아직 정의되지 않았습니다.',
      nonGoals: Array.isArray(payload.nonGoals) ? payload.nonGoals : [],
      durationHours: typeof payload.durationHours === 'number' ? payload.durationHours : null,
      difficulty: difficultyLabel(payload.difficulty),
      evidenceRules: Array.isArray(payload.evidenceRules) ? payload.evidenceRules : [],
      confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
      tradeoffs: Array.isArray(payload.rejectionReasons) ? payload.rejectionReasons : [],
    };
  });
}
