import { describe, expect, it } from 'vitest';

import { evidenceRequirementLabelKo } from './evidence-labels';

describe('evidenceRequirementLabelKo', () => {
  it('maps normalized evidence requirement tokens', () => {
    expect(evidenceRequirementLabelKo('PR')).toBe('PR 머지');
    expect(evidenceRequirementLabelKo('CHANGED_PATH:src/core.ts')).toBe('변경 경로 src/core.ts');
    expect(evidenceRequirementLabelKo('NAMED_CHECK:ci/test')).toBe('테스트 통과');
    expect(evidenceRequirementLabelKo('NAMED_CHECK:lint')).toBe('CI 체크 lint');
  });
});
