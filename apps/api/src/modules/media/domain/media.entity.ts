import type { MediaKind } from '@prisma/client';

export interface MediaProps {
  id: string;
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaKind;
  uploadedById: string | null;
  createdAt: Date;
}

export class MediaEntity {
  constructor(private readonly props: MediaProps) {}

  get id() {
    return this.props.id;
  }

  get key() {
    return this.props.key;
  }

  toPublic() {
    return { ...this.props };
  }
}
