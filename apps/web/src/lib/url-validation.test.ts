import { describe, it, expect } from 'vitest';

import { sanitizeUrl } from './url-validation';

describe('sanitizeUrl', () => {
  it('returns "#" for empty string', () => {
    expect(sanitizeUrl('')).toBe('#');
  });

  it('returns "#" for whitespace-only string', () => {
    expect(sanitizeUrl('   ')).toBe('#');
  });

  it('returns parsed href for valid https:// URL', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('returns parsed href for valid http:// URL', () => {
    expect(sanitizeUrl('http://example.com/path')).toBe('http://example.com/path');
  });

  it('prepends https:// for URL without protocol', () => {
    expect(sanitizeUrl('example.com')).toBe('https://example.com/');
  });

  it('returns "#" for javascript: URI', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
  });

  it('returns "#" for data: URI', () => {
    expect(sanitizeUrl('data:text/html,<h1>XSS</h1>')).toBe('#');
  });

  it('returns "#" for invalid URL', () => {
    expect(sanitizeUrl('not a valid url ://???')).toBe('#');
  });

  it('trims whitespace from URL before processing', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com/');
  });

  it('preserves a durable same-origin upload content path', () => {
    expect(sanitizeUrl('/api/uploads/11111111-1111-4111-8111-111111111111/content')).toBe(
      '/api/uploads/11111111-1111-4111-8111-111111111111/content',
    );
  });

  it('rejects arbitrary same-origin paths', () => {
    expect(sanitizeUrl('/api/admin')).toBe('#');
  });
});
