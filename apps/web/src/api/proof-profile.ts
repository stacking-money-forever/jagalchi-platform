import { apiClient } from './client';

export type PublicProofCriterionType =
  'MERGED_PR' | 'BASE_BRANCH' | 'CHANGED_PATH' | 'NAMED_CHECK' | 'HUMAN_CHECK';

export interface PublicProofProfileV1 {
  schemaVersion: 1;
  profile: {
    publicId: string;
    displayName: string;
    summary: string | null;
  };
  proofs: Array<{
    publicProofId: string;
    title: string;
    summary: string | null;
    competencyLabel: string;
    provider: 'GITHUB';
    verification: {
      status: 'VERIFIED';
      verifiedAt: string;
    };
    criteria: {
      passedCount: number;
      totalCount: number;
      types: PublicProofCriterionType[];
    };
  }>;
  updatedAt: string;
}

export interface OwnerProofProfile {
  state: 'DISABLED' | 'ENABLED';
  publicId: string | null;
  displayName: string;
  summary: string;
  proofs: Array<{
    missionId: string;
    publicProofId: string;
    title: string;
    summary: string | null;
    competencyLabel: string;
    verifiedAt: string;
    criteria: PublicProofProfileV1['proofs'][number]['criteria'];
    publicationState: 'ACTIVE' | 'UNPUBLISHED' | 'INVALIDATED';
    validUntil: string;
    isPublished: boolean;
  }>;
}

export interface UpdateOwnerProofProfileInput {
  idempotencyKey: string;
  state: OwnerProofProfile['state'];
  displayName: string;
  summary?: string | null;
}

export interface PublishOwnerProofInput {
  idempotencyKey: string;
}

export interface RenewOwnerProofInput {
  idempotencyKey: string;
}

export class PublicProofProfileUnavailableError extends Error {
  constructor() {
    super('Proof profile unavailable');
    this.name = 'PublicProofProfileUnavailableError';
  }
}

const CRITERION_TYPES = new Set<PublicProofCriterionType>([
  'MERGED_PR',
  'BASE_BRANCH',
  'CHANGED_PATH',
  'NAMED_CHECK',
  'HUMAN_CHECK',
]);

const publicApiBase = (() => {
  const configuredPublicUrl = process.env.NEXT_PUBLIC_API_URL;
  if (configuredPublicUrl?.startsWith('http')) return configuredPublicUrl.replace(/\/$/, '');
  const origin = process.env.API_ORIGIN ?? 'https://jagalchi-api.justn.me';
  return `${origin.replace(/\/$/, '')}/api`;
})();

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid proof profile response');
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid proof profile response');
  return value;
}

function asNullableString(value: unknown): string | null {
  if (value === null) return null;
  return asString(value);
}

function asTimestamp(value: unknown): string {
  const timestamp = asString(value);
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== timestamp) {
    throw new Error('Invalid proof profile response');
  }
  return timestamp;
}

function asCount(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('Invalid proof profile response');
  }
  return value as number;
}

function projectCriteria(value: unknown): PublicProofProfileV1['proofs'][number]['criteria'] {
  const criteria = asRecord(value);
  if (!Array.isArray(criteria.types)) throw new Error('Invalid proof profile response');
  const types = criteria.types.map((type) => {
    if (typeof type !== 'string' || !CRITERION_TYPES.has(type as PublicProofCriterionType)) {
      throw new Error('Invalid proof profile response');
    }
    return type as PublicProofCriterionType;
  });
  const passedCount = asCount(criteria.passedCount);
  const totalCount = asCount(criteria.totalCount);
  if (passedCount > totalCount) throw new Error('Invalid proof profile response');
  return { passedCount, totalCount, types };
}

function projectPublicProof(value: unknown): PublicProofProfileV1['proofs'][number] {
  const proof = asRecord(value);
  const verification = asRecord(proof.verification);
  if (proof.provider !== 'GITHUB' || verification.status !== 'VERIFIED') {
    throw new Error('Invalid proof profile response');
  }
  return {
    publicProofId: asString(proof.publicProofId),
    title: asString(proof.title),
    summary: asNullableString(proof.summary),
    competencyLabel: asString(proof.competencyLabel),
    provider: 'GITHUB',
    verification: {
      status: 'VERIFIED',
      verifiedAt: asString(verification.verifiedAt),
    },
    criteria: projectCriteria(proof.criteria),
  };
}

function projectPublicProfile(value: unknown): PublicProofProfileV1 {
  const response = asRecord(value);
  const profile = asRecord(response.profile);
  if (response.schemaVersion !== 1 || !Array.isArray(response.proofs)) {
    throw new Error('Invalid proof profile response');
  }
  return {
    schemaVersion: 1,
    profile: {
      publicId: asString(profile.publicId),
      displayName: asString(profile.displayName),
      summary: asNullableString(profile.summary),
    },
    proofs: response.proofs.map(projectPublicProof),
    updatedAt: asString(response.updatedAt),
  };
}

function projectOwnerProfile(value: unknown): OwnerProofProfile | null {
  if (value === null) return null;
  const profile = asRecord(value);
  if (profile.state !== 'DISABLED' && profile.state !== 'ENABLED') {
    throw new Error('Invalid proof profile response');
  }
  if (!Array.isArray(profile.proofs)) throw new Error('Invalid proof profile response');
  return {
    state: profile.state,
    publicId: profile.publicId === null ? null : asString(profile.publicId),
    displayName: asString(profile.displayName),
    summary: profile.summary === null ? '' : asString(profile.summary),
    proofs: profile.proofs.map((value) => {
      const publication = asRecord(value);
      if (
        publication.state !== 'ACTIVE' &&
        publication.state !== 'UNPUBLISHED' &&
        publication.state !== 'INVALIDATED'
      ) {
        throw new Error('Invalid proof profile response');
      }
      const snapshot = asRecord(publication.snapshot);
      if (snapshot.schemaVersion !== 1) throw new Error('Invalid proof profile response');
      const proof = projectPublicProof(snapshot);
      const validUntil = asTimestamp(publication.validUntil);
      return {
        missionId: asString(publication.missionId),
        publicProofId: proof.publicProofId,
        title: proof.title,
        summary: proof.summary,
        competencyLabel: proof.competencyLabel,
        verifiedAt: proof.verification.verifiedAt,
        criteria: proof.criteria,
        publicationState: publication.state,
        validUntil,
        isPublished: publication.state === 'ACTIVE' && new Date(validUntil).getTime() > Date.now(),
      };
    }),
  };
}

function getE2EPublicProofProfile(publicId: string): PublicProofProfileV1 {
  if (publicId !== 'proof-public-safe-7Kp2mQ') {
    throw new PublicProofProfileUnavailableError();
  }

  return projectPublicProfile({
    schemaVersion: 1,
    profile: {
      publicId,
      displayName: '김자갈',
      summary: '검증된 실행으로 성장하는 프론트엔드 개발자입니다.',
    },
    proofs: [
      {
        publicProofId: 'public-proof-A1b2C3',
        title: '결제 화면 접근성 개선',
        summary: '키보드 탐색과 상태 안내를 개선했습니다.',
        competencyLabel: '프론트엔드 품질',
        provider: 'GITHUB',
        verification: {
          status: 'VERIFIED',
          verifiedAt: '2026-08-20T02:30:00.000Z',
        },
        criteria: {
          passedCount: 3,
          totalCount: 3,
          types: ['MERGED_PR', 'NAMED_CHECK', 'HUMAN_CHECK'],
        },
      },
    ],
    updatedAt: '2026-08-20T02:30:00.000Z',
    private: {
      ownerId: 'private-owner-id-91',
      jobId: 'private-job-id-82',
      missionId: 'private-mission-id-73',
      runId: 'private-run-id-64',
      reviewId: 'private-review-id-55',
      reviewer: 'secret-reviewer@example.com',
      installationId: 'private-installation-46',
      repository: 'private/repository',
      branch: 'feature/private-branch',
      path: 'src/private/path.ts',
      check: 'private-check-name',
      sha: '0123456789abcdef0123456789abcdef01234567',
    },
  });
}

export async function getPublicProofProfile(publicId: string): Promise<PublicProofProfileV1> {
  if (process.env.NEXT_PUBLIC_E2E_MOCKING === 'true') {
    return getE2EPublicProofProfile(publicId);
  }

  const response = await fetch(
    `${publicApiBase}/career/proof-profiles/${encodeURIComponent(publicId)}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
    },
  );

  if (response.status === 404) throw new PublicProofProfileUnavailableError();
  if (!response.ok) throw new Error('Proof profile request failed');
  return projectPublicProfile(await response.json());
}

export async function getOwnerProofProfile(): Promise<OwnerProofProfile | null> {
  return projectOwnerProfile(await apiClient.get<unknown>('/career/proof-profile'));
}

export async function updateOwnerProofProfile(
  input: UpdateOwnerProofProfileInput,
): Promise<OwnerProofProfile> {
  const profile = projectOwnerProfile(await apiClient.put<unknown>('/career/proof-profile', input));
  if (!profile) throw new Error('Invalid proof profile response');
  return profile;
}

export async function publishOwnerProof(
  missionId: string,
  input: PublishOwnerProofInput,
): Promise<void> {
  await apiClient.post<unknown>(
    `/career/proof-profile/publish/${encodeURIComponent(missionId)}`,
    input,
  );
}

export async function renewOwnerProof(
  missionId: string,
  input: RenewOwnerProofInput,
): Promise<void> {
  await apiClient.post<unknown>(
    `/career/proof-profile/renew/${encodeURIComponent(missionId)}`,
    input,
  );
}

export async function unpublishOwnerProof(
  missionId: string,
  idempotencyKey: string,
): Promise<void> {
  await apiClient.post<unknown>(
    `/career/proof-profile/unpublish/${encodeURIComponent(missionId)}`,
    { idempotencyKey },
  );
}
