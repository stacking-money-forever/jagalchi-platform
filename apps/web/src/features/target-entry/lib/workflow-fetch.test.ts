import { describe, expect, it } from 'vitest';

import { parseRetryAfterMs } from './workflow-fetch';

describe('parseRetryAfterMs', () => {
  it('returns fallback when header is absent', () => {
    const response = new Response(null, { status: 200 });
    expect(parseRetryAfterMs(response, 1500)).toBe(1500);
  });

  it('parses Retry-After seconds and caps at 30s', () => {
    const response = new Response(null, { status: 200, headers: { 'Retry-After': '45' } });
    expect(parseRetryAfterMs(response)).toBe(30_000);
  });

  it('parses small Retry-After values in milliseconds', () => {
    const response = new Response(null, { status: 200, headers: { 'Retry-After': '2' } });
    expect(parseRetryAfterMs(response)).toBe(2000);
  });
});
