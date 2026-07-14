import type { MediaKind } from '@prisma/client';
import type { MediaEntity } from './media.entity';

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

export interface MediaListFilters {
  page: number;
  limit: number;
  kind?: MediaKind;
}

export interface MediaListResult {
  items: MediaEntity[];
  total: number;
}

export interface CreateMediaInput {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaKind;
  uploadedById?: string;
}

export interface MediaRepository {
  findMany(filters: MediaListFilters): Promise<MediaListResult>;
  findById(id: string): Promise<MediaEntity | null>;
  create(input: CreateMediaInput): Promise<MediaEntity>;
  delete(id: string): Promise<void>;
}
