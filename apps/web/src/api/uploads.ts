import { isUploadContentPath } from '@/lib/upload-content-path';

import { apiClient } from './client';
import { AttachmentUploadError, validateAttachmentFile } from './upload';

interface UploadApproval {
  id: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresInSeconds: number;
}

interface CompletedUpload {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  status: 'READY';
  publicUrl: string | null;
}

export interface RoadmapAttachmentUpload {
  id: string;
  resourceUrl: string;
  fileName: string;
  contentType: string;
  size: number;
}

export interface RoadmapAttachmentUploadOptions {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

export function roadmapAttachmentContentPath(uploadId: string): string {
  const path = `/api/uploads/${encodeURIComponent(uploadId)}/content`;
  if (!isUploadContentPath(path)) {
    throw new AttachmentUploadError('UPLOAD_FAILED', 'Upload response contains an invalid id');
  }
  return path;
}

function putApprovedUpload(
  approval: UploadApproval,
  file: File,
  options: RoadmapAttachmentUploadOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new AttachmentUploadError('ABORTED', 'Upload aborted'));
      return;
    }

    const xhr = new XMLHttpRequest();
    const abortHandler = () => xhr.abort();
    const cleanup = () => options.signal?.removeEventListener('abort', abortHandler);

    xhr.open(approval.method, approval.uploadUrl);
    for (const [name, value] of Object.entries(approval.headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        options.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new AttachmentUploadError('UPLOAD_FAILED', xhr.statusText, xhr.status));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new AttachmentUploadError('UPLOAD_FAILED', 'Upload failed', xhr.status));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new AttachmentUploadError('ABORTED', 'Upload aborted'));
    };

    options.signal?.addEventListener('abort', abortHandler, { once: true });
    xhr.send(file);
  });
}

export async function uploadRoadmapAttachment(
  file: File,
  roadmapId: string,
  options: RoadmapAttachmentUploadOptions = {},
): Promise<RoadmapAttachmentUpload> {
  const validationError = validateAttachmentFile(file);
  if (validationError) throw new AttachmentUploadError(validationError, validationError);
  if (!roadmapId) {
    throw new AttachmentUploadError('UPLOAD_FAILED', 'Roadmap attachment requires a roadmap');
  }
  if (options.signal?.aborted) throw new AttachmentUploadError('ABORTED', 'Upload aborted');

  const approval = await apiClient.post<UploadApproval>('/uploads', {
    purpose: 'ROADMAP_ATTACHMENT',
    roadmapId,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
  await putApprovedUpload(approval, file, options);
  const completed = await apiClient.post<CompletedUpload>(`/uploads/${approval.id}/complete`);
  return {
    id: completed.id,
    resourceUrl: roadmapAttachmentContentPath(completed.id),
    fileName: completed.fileName,
    contentType: completed.contentType,
    size: completed.size,
  };
}

export async function uploadProfileImage(file: File): Promise<string> {
  const approval = await apiClient.post<UploadApproval>('/uploads', {
    purpose: 'PROFILE_IMAGE',
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
  const uploaded = await fetch(approval.uploadUrl, {
    method: approval.method,
    headers: approval.headers,
    body: file,
  });
  if (!uploaded.ok) throw new Error('프로필 이미지를 업로드하지 못했습니다.');
  const completed = await apiClient.post<CompletedUpload>(`/uploads/${approval.id}/complete`);
  if (!completed.publicUrl) throw new Error('프로필 이미지 주소를 만들지 못했습니다.');
  return completed.publicUrl;
}
