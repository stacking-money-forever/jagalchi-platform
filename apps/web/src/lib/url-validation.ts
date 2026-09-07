import { isUploadContentPath } from './upload-content-path';

const ALLOWED_PROTOCOLS = ['https:', 'http:'];

/**
 * Sanitizes a URL to prevent XSS attacks
 * Blocks javascript:, data:, and other dangerous protocols
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL or '#' if invalid/dangerous
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '#';
  if (isUploadContentPath(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return '#';

  try {
    // Add https:// if no protocol specified
    const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);

    // Block dangerous protocols
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return '#';
    }

    return parsed.href;
  } catch {
    // Invalid URL format
    return '#';
  }
}
