const UPLOAD_CONTENT_PATH =
  /^\/api\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/content$/i;

export function isUploadContentPath(value: string): boolean {
  return UPLOAD_CONTENT_PATH.test(value);
}
