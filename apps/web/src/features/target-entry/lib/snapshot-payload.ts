export interface CitationView {
  id: string;
  label: string;
  quote?: string;
}

export interface ProfileFindingView {
  id: string;
  label: string;
  status: 'OBSERVED' | 'INFERRED';
  citationIds: string[];
  note?: string;
}

export interface DiffGapView {
  id: string;
  competencyId: string;
  description: string;
  status: 'OBSERVED' | 'INFERRED' | 'MISSING';
}

export interface ProfileRepositoryView {
  id: string;
  fullName: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function parseCitations(payload: Record<string, unknown>): CitationView[] {
  const citations = payload.citations;
  if (!Array.isArray(citations)) return [];
  const parsed: CitationView[] = [];
  for (const [index, item] of citations.entries()) {
    const record = asRecord(item);
    if (!record) continue;
    const id = asString(record.id, `citation-${index + 1}`);
    const label = asString(record.label ?? record.title ?? record.text ?? record.statement, id);
    const quoteValue = record.quote;
    const quote = typeof quoteValue === 'string' && quoteValue.length > 0 ? quoteValue : undefined;
    parsed.push({ id, label, quote });
  }
  return parsed;
}

export function parseProfileRepositories(
  payload: Record<string, unknown>,
): ProfileRepositoryView[] {
  const repositories = payload.repositories ?? payload.linkedRepositories;
  if (!Array.isArray(repositories)) return [];
  const parsed: ProfileRepositoryView[] = [];
  for (const [index, item] of repositories.entries()) {
    const record = asRecord(item);
    if (!record) continue;
    const id = asString(record.id ?? record.repositoryId ?? record.githubRepositoryId, '');
    if (!id) continue;
    parsed.push({
      id,
      fullName: asString(record.fullName ?? record.name ?? record.label, `repository-${index + 1}`),
    });
  }
  return parsed;
}

export function parseProfileFindings(payload: Record<string, unknown>): ProfileFindingView[] {
  const interpretation = asRecord(payload.interpretation);
  const findings = interpretation?.findings;
  if (!Array.isArray(findings)) return [];
  const parsed: ProfileFindingView[] = [];
  for (const [index, item] of findings.entries()) {
    const record = asRecord(item);
    if (!record) continue;
    const statusRaw = asString(record.status, 'INFERRED').toUpperCase();
    const status: ProfileFindingView['status'] = statusRaw === 'OBSERVED' ? 'OBSERVED' : 'INFERRED';
    const noteValue = record.note;
    parsed.push({
      id: asString(record.id ?? record.competencyId, `finding-${index + 1}`),
      label: asString(record.label ?? record.competencyId ?? record.title, `역량 ${index + 1}`),
      status,
      citationIds: Array.isArray(record.citationIds)
        ? record.citationIds.filter((id): id is string => typeof id === 'string')
        : [],
      note: typeof noteValue === 'string' && noteValue.length > 0 ? noteValue : undefined,
    });
  }
  return parsed;
}

export function parseDiffGaps(payload: Record<string, unknown>): DiffGapView[] {
  const missing = payload.missing;
  if (!Array.isArray(missing)) return [];
  const parsed: DiffGapView[] = [];
  for (const [index, item] of missing.entries()) {
    const record = asRecord(item);
    if (!record) continue;
    const statusRaw = asString(record.status, 'MISSING').toUpperCase();
    const status: DiffGapView['status'] =
      statusRaw === 'OBSERVED' || statusRaw === 'INFERRED' || statusRaw === 'MISSING'
        ? statusRaw
        : 'MISSING';
    const competencyId = asString(record.competencyId ?? record.id, `gap-${index + 1}`);
    parsed.push({
      id: asString(record.id, competencyId),
      competencyId,
      description: asString(record.description ?? record.label ?? record.title, competencyId),
      status,
    });
  }
  return parsed;
}

export function parseTargetHeader(payload: Record<string, unknown>): {
  company: string;
  role: string;
} {
  return {
    company: asString(payload.company, '회사 미확인'),
    role: asString(payload.role, '직무 미확인'),
  };
}
