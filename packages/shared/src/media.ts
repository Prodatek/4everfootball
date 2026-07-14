export const MediaKind = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  DOCUMENT: "DOCUMENT",
} as const;

export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];

export interface Media {
  id: string;
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaKind;
  uploadedById: string | null;
  createdAt: string;
}
