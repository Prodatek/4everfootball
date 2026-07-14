import type { MediaKind } from '@prisma/client';

export const ALLOWED_MIME_TYPES: Record<string, MediaKind> = {
  'image/jpeg': 'IMAGE',
  'image/png': 'IMAGE',
  'image/webp': 'IMAGE',
  'image/gif': 'IMAGE',
  'video/mp4': 'VIDEO',
  'video/webm': 'VIDEO',
  'application/pdf': 'DOCUMENT',
};

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function mediaKindForMimeType(mimeType: string): MediaKind | null {
  return ALLOWED_MIME_TYPES[mimeType] ?? null;
}
