import { api } from '@/lib/api';

export async function downloadUrl(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export async function downloadMedia(
  mediaId: string,
  filename: string,
  fallbackUrl?: string,
): Promise<void> {
  try {
    const media = await api.getUpload(mediaId);
    if (media.originalUrl) {
      await downloadUrl(media.originalUrl, filename);
      return;
    }
  } catch {
    // fall back to the stale signed URL below
  }
  if (fallbackUrl) {
    await downloadUrl(fallbackUrl, filename);
  }
}