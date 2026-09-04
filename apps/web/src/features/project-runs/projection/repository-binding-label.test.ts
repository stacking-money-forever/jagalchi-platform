import { describe, expect, it } from 'vitest';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { resolveRepositoryDisplayName } from './repository-binding-label';

describe('resolveRepositoryDisplayName', () => {
  it('prefers repositoryBinding.repositoryName over proof facts', () => {
    expect(
      resolveRepositoryDisplayName(
        {
          repositoryName: 'fixture/verification-repository',
          pullNumber: 17,
          headSha: null,
          pullUrl: null,
        },
        { repositoryName: 'other/repo' } as NonNullable<ProjectRunProjection['proof']>['facts'],
      ),
    ).toBe('fixture/verification-repository');
  });

  it('falls back to proof facts when binding name is absent', () => {
    expect(
      resolveRepositoryDisplayName(
        { repositoryName: null, pullNumber: null, headSha: null, pullUrl: null },
        { repositoryName: 'fixture/verification-repository' } as NonNullable<
          ProjectRunProjection['proof']
        >['facts'],
      ),
    ).toBe('fixture/verification-repository');
  });

  it('returns null when no repository label is available', () => {
    expect(resolveRepositoryDisplayName(undefined, undefined)).toBeNull();
  });
});
