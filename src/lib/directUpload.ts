import { api, type ApiMedia } from '@/lib/api';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 120;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type UploadStage = 'init' | 'upload' | 'complete' | 'poll' | 'failed';

export class UploadError extends Error {
  stage: UploadStage;

  constructor(message: string, stage: UploadStage) {
    super(message);
    this.name = 'UploadError';
    this.stage = stage;
  }
}

export interface UploadResult {
  media: ApiMedia;
  completed: boolean;
}

export async function uploadFile(
  file: File,
  onProgress: (percent: number) => void,
  eventId?: string,
): Promise<UploadResult> {
  onProgress(3);

  const mimeType = file.type || 'application/octet-stream';

  let init: Awaited<ReturnType<typeof api.initUpload>>;
  try {
    init = await api.initUpload({
      fileName: file.name,
      mimeType,
      size: file.size,
      eventId,
    });
  } catch (err) {
    throw new UploadError(
      err instanceof Error ? err.message : 'Failed to initialize upload',
      'init',
    );
  }

  onProgress(8);

  try {
    await putToSignedUrl(init.uploadUrl, file, mimeType, (loaded, total) => {
      const base = 8;
      const range = 82;
      const pct = total > 0 ? (loaded / total) * range : 0;
      onProgress(Math.min(base + pct, 90));
    });
  } catch (err) {
    throw new UploadError(
      err instanceof Error ? err.message : 'Upload to storage failed',
      'upload',
    );
  }

  onProgress(92);

  let status: ApiMedia['status'];
  try {
    const result = await api.completeUpload(init.uploadId);
    status = result.status;
  } catch (err) {
    throw new UploadError(
      err instanceof Error ? err.message : 'Failed to complete upload',
      'complete',
    );
  }

  if (status === 'READY') {
    onProgress(100);
    const media = await api.getUpload(init.uploadId);
    return { media, completed: true };
  }

  onProgress(94);

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    await delay(POLL_INTERVAL_MS);
    const media = await api.getUpload(init.uploadId).catch(() => null);
    if (!media) continue;

    if (media.status === 'READY') {
      onProgress(100);
      return { media, completed: true };
    }
    if (media.status === 'FAILED') {
      throw new UploadError('Media processing failed', 'failed');
    }
  }

  throw new UploadError('Media processing timed out', 'poll');
}

function putToSignedUrl(
  url: string,
  file: File,
  mimeType: string,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Storage returned status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}
