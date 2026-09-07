import type { ProjectRunProjection } from '@jagalchi/api-client';

type RepositoryBinding = ProjectRunProjection['repositoryBinding'];
type ProofFacts = NonNullable<ProjectRunProjection['proof']>['facts'];

export function resolveRepositoryDisplayName(
  binding: RepositoryBinding,
  facts?: ProofFacts,
): string | null {
  const fromBinding = binding?.repositoryName?.trim();
  if (fromBinding) return fromBinding;

  const fromFacts = facts?.repositoryName?.trim();
  if (fromFacts) return fromFacts;

  return null;
}
