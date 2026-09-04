import { describe, expect, it } from 'vitest';

import { verificationStateLabelKo } from './helpers';

describe('e2e-v1-local helpers', () => {
  it('maps proof verification states to Korean labels used in Playwright assertions', () => {
    expect(verificationStateLabelKo('PASS')).toBe('검증 통과');
    expect(verificationStateLabelKo('PENDING')).toBe('검증 대기');
    expect(verificationStateLabelKo('FAIL')).toBe('검증 실패');
    expect(verificationStateLabelKo('STALE')).toBe('검증 만료');
  });
});
