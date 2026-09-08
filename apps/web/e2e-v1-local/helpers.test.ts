import { describe, expect, it } from 'vitest';

import { verificationStateLabelKo, WAVE_B_FIXTURE_REPOSITORY_LABEL } from './helpers';

describe('e2e-v1-local helpers', () => {
  it('maps proof verification states to Korean labels used in Playwright assertions', () => {
    expect(verificationStateLabelKo('PASS')).toBe('통과');
    expect(verificationStateLabelKo('PENDING')).toBe('대기');
    expect(verificationStateLabelKo('FAIL')).toBe('실패');
    expect(verificationStateLabelKo('STALE')).toBe('만료');
  });

  it('pins the Wave B fixture repository label used by repository-bind helpers', () => {
    expect(WAVE_B_FIXTURE_REPOSITORY_LABEL).toBe('fixture/verification-repository');
  });
});
