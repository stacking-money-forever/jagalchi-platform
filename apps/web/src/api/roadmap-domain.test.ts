import { describe, expect, it } from 'vitest';

import { isReadOnlyProjectRunRoadmap } from './roadmap-domain';

describe('isReadOnlyProjectRunRoadmap', () => {
  it('recognizes both reserved project-run tags', () => {
    expect(isReadOnlyProjectRunRoadmap({ tags: ['project-run'] })).toBe(true);
    expect(isReadOnlyProjectRunRoadmap({ tags: ['local-seed'] })).toBe(true);
  });

  it('leaves ordinary legacy roadmap tags editable', () => {
    expect(isReadOnlyProjectRunRoadmap({ tags: ['react', 'frontend'] })).toBe(false);
  });
});
