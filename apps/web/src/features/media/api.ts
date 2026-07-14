import type { Media, MediaKind, PaginatedResult } from "@4ef/shared";
import axios from "axios";
import { apiClient } from "@/lib/api-client";

export interface MediaQuery {
  page?: number;
  limit?: number;
  kind?: MediaKind;
}

export async function fetchMedia(query: MediaQuery = {}): Promise<PaginatedResult<Media>> {
  const { data } = await apiClient.get<PaginatedResult<Media>>("/media", {
    params: query,
  });
  return data;
}

export async function deleteMedia(id: string): Promise<void> {
  await apiClient.delete(`/media/${id}`);
}

interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Uploads a file directly to S3-compatible storage via a presigned URL (the
 * file bytes never pass through our API), then registers the result in the
 * media library.
 */
export async function uploadFile(file: File): Promise<Media> {
  const { data: uploadTarget } = await apiClient.post<UploadUrlResponse>(
    "/media/upload-url",
    { filename: file.name, mimeType: file.type },
  );

  await axios.put(uploadTarget.uploadUrl, file, {
    headers: { "Content-Type": file.type },
  });

  const { data: media } = await apiClient.post<Media>("/media", {
    key: uploadTarget.key,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });

  return media;
}
