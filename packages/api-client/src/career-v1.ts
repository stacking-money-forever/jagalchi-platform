import type { components } from './schema.generated.js';
import type { ApiTransport } from './index.js';

export type TargetImportDto = components['schemas']['TargetImportDto'];
export type ProfileSnapshotOperationDto = components['schemas']['ProfileSnapshotOperationDto'];
export type ConfirmProfileSnapshotDto = components['schemas']['ConfirmProfileSnapshotDto'];
export type CreateCareerDiffDto = components['schemas']['CreateCareerDiffDto'];
export type ConfirmCareerDiffDto = components['schemas']['ConfirmCareerDiffDto'];
export type ProjectProposalOperationDto = components['schemas']['ProjectProposalOperationDto'];
export type CreateProjectRunOperationDto = components['schemas']['CreateProjectRunOperationDto'];
export type RepositoryBindingDto = components['schemas']['RepositoryBindingDto'];
export type ProposalConstraintsDto = components['schemas']['ProposalConstraintsDto'];
export type EligibleGithubRepositoryDto = components['schemas']['EligibleGithubRepositoryDto'];

export type RepositoryMode = RepositoryBindingDto['mode'];

export type WorkflowOperationState =
  | 'PENDING'
  | 'RUNNING'
  | 'CANCEL_REQUESTED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export interface WorkflowOperationResource {
  resourceType: string;
  resourceId: string;
  resourceHref: string;
}

export interface WorkflowOperationView {
  id: string;
  kind: string;
  state: WorkflowOperationState;
  version: number;
  attempt: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  result: WorkflowOperationResource | null;
  error: { code: string; retryable: boolean } | null;
  createdAt: string;
  updatedAt: string;
  body: unknown;
}

export interface CareerSnapshotRecord<TPayload = Record<string, unknown>> {
  id: string;
  ownerId: string;
  schemaVersion: number;
  payload: TPayload;
  createdAt: string;
  state?: 'DRAFT' | 'CONFIRMED';
  careerTargetId?: string;
  careerTargetVersionId?: string;
  candidateProfileSnapshotId?: string;
  sourceSnapshotId?: string | null;
  captureStatus?: 'AUTOMATIC' | 'DEGRADED_MANUAL_CAPTURE';
  version?: number;
}

export interface ProjectProposalRecord {
  id: string;
  proposalSetId: string;
  blueprintVersionId: string;
  rank: number;
  payload: ProjectProposalPayload;
  createdAt: string;
}

export interface ProjectProposalPayload {
  id?: string;
  title?: string;
  projectBlueprintId?: string;
  projectBlueprintVersion?: number;
  repositoryMode?: RepositoryMode;
  citedGapIds?: string[];
  citationIds?: string[];
  boundedOutcome?: string;
  nonGoals?: string[];
  durationHours?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  evidenceRules?: string[];
  confidence?: number;
  rejectionReasons?: string[];
  [key: string]: unknown;
}

export interface ProjectProposalSetView extends CareerSnapshotRecord {
  proposals: ProjectProposalRecord[];
  careerDiffSnapshotId?: string;
}

export interface IdempotencyHeaders {
  idempotencyKey: string;
}

export interface VersionedCommandHeaders extends IdempotencyHeaders {
  ifMatch: string;
}

export const FIXTURE_JOB_POSTING_URL = 'https://fixture.invalid/jobs/software-engineer';

/** Deterministic manual-capture body aligned with API career-v1 citation fixtures. */
export const FIXTURE_MANUAL_CAPTURE_SOURCE_TEXT =
  'A manually captured backend role requiring TypeScript and reliable tests.';

export const REPOSITORY_MODE_ORDER: readonly RepositoryMode[] = [
  'EXISTING_OWNED',
  'OPEN_SOURCE_CONTRIBUTION',
  'MANUAL_GREENFIELD',
] as const;

function idempotencyHeader(key: string): Record<string, string> {
  return { 'idempotency-key': key };
}

function versionedHeaders(headers: VersionedCommandHeaders): Record<string, string> {
  return {
    'idempotency-key': headers.idempotencyKey,
    'if-match': headers.ifMatch,
  };
}

export function importCareerTarget(
  transport: ApiTransport,
  body: TargetImportDto,
  headers: IdempotencyHeaders,
): Promise<WorkflowOperationView> {
  return transport.request<WorkflowOperationView>('/career/target-imports', {
    method: 'POST',
    headers: idempotencyHeader(headers.idempotencyKey),
    body: JSON.stringify(body),
  });
}

export function startGithubProfileSnapshot(
  transport: ApiTransport,
  body: ProfileSnapshotOperationDto,
  headers: IdempotencyHeaders,
): Promise<WorkflowOperationView> {
  return transport.request<WorkflowOperationView>('/career/profile-snapshot-operations/github', {
    method: 'POST',
    headers: idempotencyHeader(headers.idempotencyKey),
    body: JSON.stringify(body),
  });
}

export function getCareerTargetVersion(
  transport: ApiTransport,
  id: string,
): Promise<CareerSnapshotRecord> {
  return transport.request<CareerSnapshotRecord>(`/career/target-versions/${encodeURIComponent(id)}`);
}

export function getCandidateProfileSnapshot(
  transport: ApiTransport,
  id: string,
): Promise<CareerSnapshotRecord> {
  return transport.request<CareerSnapshotRecord>(`/career/profile-snapshots/${encodeURIComponent(id)}`);
}

export function confirmCandidateProfileSnapshot(
  transport: ApiTransport,
  id: string,
  body: ConfirmProfileSnapshotDto,
  headers: IdempotencyHeaders,
): Promise<CareerSnapshotRecord> {
  return transport.request<CareerSnapshotRecord>(
    `/career/profile-snapshots/${encodeURIComponent(id)}/confirm`,
    {
      method: 'POST',
      headers: idempotencyHeader(headers.idempotencyKey),
      body: JSON.stringify(body),
    },
  );
}

export function createCareerDiffSnapshot(
  transport: ApiTransport,
  targetId: string,
  body: CreateCareerDiffDto,
  headers: IdempotencyHeaders,
): Promise<CareerSnapshotRecord> {
  return transport.request<CareerSnapshotRecord>(
    `/career/targets/${encodeURIComponent(targetId)}/diff-snapshots`,
    {
      method: 'POST',
      headers: idempotencyHeader(headers.idempotencyKey),
      body: JSON.stringify(body),
    },
  );
}

export function getCareerDiffSnapshot(
  transport: ApiTransport,
  id: string,
): Promise<CareerSnapshotRecord> {
  return transport.request<CareerSnapshotRecord>(`/career/diff-snapshots/${encodeURIComponent(id)}`);
}

export function confirmCareerDiffSnapshot(
  transport: ApiTransport,
  id: string,
  body: ConfirmCareerDiffDto,
  headers: IdempotencyHeaders,
): Promise<CareerSnapshotRecord> {
  return transport.request<CareerSnapshotRecord>(
    `/career/diff-snapshots/${encodeURIComponent(id)}/confirm`,
    {
      method: 'POST',
      headers: idempotencyHeader(headers.idempotencyKey),
      body: JSON.stringify(body),
    },
  );
}

export function startProjectProposalOperation(
  transport: ApiTransport,
  targetId: string,
  body: ProjectProposalOperationDto,
  headers: IdempotencyHeaders,
): Promise<WorkflowOperationView> {
  return transport.request<WorkflowOperationView>(
    `/career/targets/${encodeURIComponent(targetId)}/project-proposal-operations`,
    {
      method: 'POST',
      headers: idempotencyHeader(headers.idempotencyKey),
      body: JSON.stringify(body),
    },
  );
}

export function getProjectProposalSet(
  transport: ApiTransport,
  id: string,
): Promise<ProjectProposalSetView> {
  return transport.request<ProjectProposalSetView>(
    `/career/project-proposal-sets/${encodeURIComponent(id)}`,
  );
}

export function createProjectRunOperation(
  transport: ApiTransport,
  body: CreateProjectRunOperationDto,
  headers: IdempotencyHeaders,
): Promise<WorkflowOperationView> {
  return transport.request<WorkflowOperationView>('/project-run-operations', {
    method: 'POST',
    headers: idempotencyHeader(headers.idempotencyKey),
    body: JSON.stringify(body),
  });
}

export function getWorkflowOperation(
  transport: ApiTransport,
  id: string,
  signal?: AbortSignal,
): Promise<WorkflowOperationView> {
  return transport.request<WorkflowOperationView>(`/workflow-operations/${encodeURIComponent(id)}`, {
    method: 'GET',
    signal,
  });
}

export function cancelWorkflowOperation(
  transport: ApiTransport,
  id: string,
  headers: VersionedCommandHeaders,
): Promise<WorkflowOperationView> {
  return transport.request<WorkflowOperationView>(
    `/workflow-operations/${encodeURIComponent(id)}/cancel`,
    {
      method: 'POST',
      headers: versionedHeaders(headers),
    },
  );
}

export function isWorkflowTerminal(state: WorkflowOperationState): boolean {
  return state === 'SUCCEEDED' || state === 'FAILED' || state === 'CANCELLED';
}

export function getEligibleGithubRepositories(
  transport: ApiTransport,
): Promise<EligibleGithubRepositoryDto[]> {
  return transport.request<EligibleGithubRepositoryDto[]>('/career/eligible-github-repositories');
}
