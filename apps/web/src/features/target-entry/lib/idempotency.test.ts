import { describe, expect, it } from 'vitest';

import { createIdempotencyKey } from './idempotency';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createIdempotencyKey', () => {
  it('returns a UUID accepted by career workflow APIs', () => {
    const key = createIdempotencyKey('target');
    expect(key).toMatch(UUID_PATTERN);
    expect(key).not.toContain('target-');
  });
});
