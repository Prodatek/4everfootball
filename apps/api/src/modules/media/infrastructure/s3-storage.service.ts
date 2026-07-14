import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UPLOAD_URL_TTL_SECONDS = 300;

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY');

    this.client = new S3Client({
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      region: this.config.get<string>('S3_REGION'),
      // Static keys + path-style addressing are for MinIO/local dev. When
      // they're absent (real AWS S3), fall back to the SDK's default
      // credential chain (the ECS task role) and virtual-hosted addressing.
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true }
        : {}),
    });
    this.bucket = this.config.get<string>('S3_BUCKET') as string;
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL') as string;
  }

  async createUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
  }

  publicUrlFor(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
