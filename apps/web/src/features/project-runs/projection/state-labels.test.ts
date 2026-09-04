import { describe, expect, it } from 'vitest';

import { publicationLabelKo, STATE_LABEL_KO, verificationLabelKo } from './state-labels';

describe('state labels', () => {
  it('renders Korean labels for every task state', () => {
    expect(STATE_LABEL_KO.DONE).toBe('완료');
    expect(STATE_LABEL_KO.BLOCKED).toBe('막힘');
  });

  it('maps proof verification and publication states', () => {
    expect(verificationLabelKo('STALE')).toBe('만료');
    expect(publicationLabelKo('INVALIDATED')).toBe('무효화');
  });
});
