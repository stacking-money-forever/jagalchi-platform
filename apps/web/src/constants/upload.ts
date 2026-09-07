export const ATTACHMENT_UPLOAD_CONSTRAINTS = {
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'],
  accept: 'image/jpeg,image/png,image/webp,application/pdf,text/plain',
} as const;
