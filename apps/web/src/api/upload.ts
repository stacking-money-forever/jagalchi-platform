import { ATTACHMENT_UPLOAD_CONSTRAINTS } from '@/constants/upload';

export { ATTACHMENT_UPLOAD_CONSTRAINTS };

export type AttachmentUploadErrorCode =
  'EMPTY_FILE' | 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE' | 'UPLOAD_FAILED' | 'ABORTED';

export class AttachmentUploadError extends Error {
  code: AttachmentUploadErrorCode;
  status?: number;

  constructor(code: AttachmentUploadErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'AttachmentUploadError';
    this.code = code;
    this.status = status;
  }
}

export function validateAttachmentFile(file: File): AttachmentUploadErrorCode | null {
  if (file.size === 0) {
    return 'EMPTY_FILE';
  }

  if (file.size > ATTACHMENT_UPLOAD_CONSTRAINTS.maxSizeBytes) {
    return 'FILE_TOO_LARGE';
  }

  const allowedMimeTypes: readonly string[] = ATTACHMENT_UPLOAD_CONSTRAINTS.allowedMimeTypes;
  if (!allowedMimeTypes.includes(file.type)) {
    return 'UNSUPPORTED_TYPE';
  }

  return null;
}
