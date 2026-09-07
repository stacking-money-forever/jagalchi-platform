import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiClient: { post: vi.fn() },
}));

import { apiClient } from './client';
import { uploadProfileImage } from './uploads';

describe('uploads API', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('completes an approved object upload before returning its public URL', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        id: 'upload-1',
        uploadUrl: 'https://storage.example/signed',
        method: 'PUT',
        headers: { 'content-type': 'image/png' },
        expiresInSeconds: 600,
      })
      .mockResolvedValueOnce({
        id: 'upload-1',
        fileName: 'avatar.png',
        contentType: 'image/png',
        size: 3,
        status: 'READY',
        publicUrl: 'https://cdn.example/avatar.png',
      });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const file = new File(['png'], 'avatar.png', { type: 'image/png' });

    await expect(uploadProfileImage(file)).resolves.toBe('https://cdn.example/avatar.png');
    expect(fetch).toHaveBeenCalledWith(
      'https://storage.example/signed',
      expect.objectContaining({ method: 'PUT', body: file }),
    );
    expect(apiClient.post).toHaveBeenLastCalledWith('/uploads/upload-1/complete');
  });

  it('creates, uploads, and completes a roadmap attachment with a durable content path', async () => {
    const uploadId = '22222222-2222-4222-8222-222222222222';
    const progress = vi.fn();
    const open = vi.fn();
    const setRequestHeader = vi.fn();
    class SuccessfulUploadRequest {
      status = 200;
      statusText = 'OK';
      upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onabort: (() => void) | null = null;
      open = open;
      setRequestHeader = setRequestHeader;
      abort = vi.fn();
      send(file: File) {
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: file.size,
          total: file.size,
        } as ProgressEvent);
        this.onload?.();
      }
    }
    vi.stubGlobal('XMLHttpRequest', SuccessfulUploadRequest);
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        id: uploadId,
        uploadUrl: 'https://storage.example/signed',
        method: 'PUT',
        headers: { 'content-type': 'application/pdf' },
        expiresInSeconds: 600,
      })
      .mockResolvedValueOnce({
        id: uploadId,
        fileName: 'lesson.pdf',
        contentType: 'application/pdf',
        size: 6,
        status: 'READY',
        publicUrl: null,
      });
    const file = new File(['lesson'], 'lesson.pdf', { type: 'application/pdf' });

    const { uploadRoadmapAttachment } = await import('./uploads');
    await expect(
      uploadRoadmapAttachment(file, '11111111-1111-4111-8111-111111111111', {
        onProgress: progress,
      }),
    ).resolves.toEqual({
      id: uploadId,
      resourceUrl: `/api/uploads/${uploadId}/content`,
      fileName: 'lesson.pdf',
      contentType: 'application/pdf',
      size: 6,
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/uploads', {
      purpose: 'ROADMAP_ATTACHMENT',
      roadmapId: '11111111-1111-4111-8111-111111111111',
      fileName: 'lesson.pdf',
      contentType: 'application/pdf',
      size: 6,
    });
    expect(open).toHaveBeenCalledWith('PUT', 'https://storage.example/signed');
    expect(setRequestHeader).toHaveBeenCalledWith('content-type', 'application/pdf');
    expect(progress).toHaveBeenLastCalledWith(100);
    expect(apiClient.post).toHaveBeenNthCalledWith(2, `/uploads/${uploadId}/complete`);
  });
});
