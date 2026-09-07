import { describe, it, expect } from 'vitest';

import { validateUrl, isValidUrl } from './url-validation';

describe('validateUrl', () => {
  it('returns empty string for empty input', () => {
    expect(validateUrl('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(validateUrl('   ')).toBe('');
  });

  it('returns the URL as-is for valid https:// URL', () => {
    expect(validateUrl('https://example.com')).toBe('https://example.com');
  });

  it('returns the URL as-is for valid http:// URL', () => {
    expect(validateUrl('http://example.com')).toBe('http://example.com');
  });

  it('returns the URL as-is for mailto: URL', () => {
    expect(validateUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
  });

  it('returns null for javascript: URI (XSS prevention)', () => {
    expect(validateUrl('javascript:alert(1)')).toBeNull();
  });

  it('returns null for data: URI', () => {
    expect(validateUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('returns null for vbscript: URI', () => {
    expect(validateUrl('vbscript:MsgBox("XSS")')).toBeNull();
  });

  it('returns null for mixed-case dangerous protocol (JavaScript:)', () => {
    expect(validateUrl('JavaScript:alert(1)')).toBeNull();
  });

  it('prepends https:// for URL without protocol', () => {
    const result = validateUrl('example.com');
    expect(result).toBe('https://example.com/');
  });

  it('returns null for disallowed protocol (ftp://)', () => {
    expect(validateUrl('ftp://files.example.com')).toBeNull();
  });

  it('returns null for completely invalid URL', () => {
    expect(validateUrl('not a valid url ://???')).toBeNull();
  });

  it('preserves a durable same-origin upload content path', () => {
    expect(validateUrl('/api/uploads/11111111-1111-4111-8111-111111111111/content')).toBe(
      '/api/uploads/11111111-1111-4111-8111-111111111111/content',
    );
  });

  it('does not treat arbitrary same-origin paths as upload content', () => {
    expect(validateUrl('/api/admin')).toBeNull();
  });
});

describe('isValidUrl', () => {
  it('returns true for a valid URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('returns false for a dangerous protocol', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('returns true for empty string (allowed as unused slot)', () => {
    expect(isValidUrl('')).toBe(true);
  });
});
