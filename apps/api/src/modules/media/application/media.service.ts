import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  paginate,
  type PaginatedResult,
} from '../../../common/dto/paginated-result';
import { slugify } from '../../../common/utils/slugify';
import { S3StorageService } from '../infrastructure/s3-storage.service';
import { mediaKindForMimeType } from '../domain/mime-types';
import { MEDIA_REPOSITORY } from '../domain/media.repository';
import type { MediaRepository } from '../domain/media.repository';
import type { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import type { ConfirmUploadDto } from './dto/confirm-upload.dto';
import type { QueryMediaDto } from './dto/query-media.dto';

@Injectable()
export class MediaService {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly mediaRepository: MediaRepository,
    private readonly storage: S3StorageService,
  ) {}

  async requestUploadUrl(dto: RequestUploadUrlDto) {
    const kind = mediaKindForMimeType(dto.mimeType);

    if (!kind) {
      throw new BadRequestException(`Unsupported file type: ${dto.mimeType}`);
    }

    const key = this.generateKey(dto.filename);
    const uploadUrl = await this.storage.createUploadUrl(key, dto.mimeType);
    const publicUrl = this.storage.publicUrlFor(key);

    return { uploadUrl, key, publicUrl };
  }

  async confirmUpload(dto: ConfirmUploadDto, uploadedById?: string) {
    const kind = mediaKindForMimeType(dto.mimeType);

    if (!kind) {
      throw new BadRequestException(`Unsupported file type: ${dto.mimeType}`);
    }

    const media = await this.mediaRepository.create({
      key: dto.key,
      url: this.storage.publicUrlFor(dto.key),
      filename: dto.filename,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      kind,
      uploadedById,
    });

    return media.toPublic();
  }

  async list(query: QueryMediaDto): Promise<PaginatedResult<unknown>> {
    const { items, total } = await this.mediaRepository.findMany({
      page: query.page,
      limit: query.limit,
      kind: query.kind,
    });

    return paginate(
      items.map((item) => item.toPublic()),
      total,
      query.page,
      query.limit,
    );
  }

  async remove(id: string) {
    const existing = await this.mediaRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Media not found');
    }

    await this.storage.deleteObject(existing.key);
    await this.mediaRepository.delete(id);
  }

  private generateKey(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    const extension = dotIndex >= 0 ? filename.slice(dotIndex) : '';
    const base =
      slugify(dotIndex >= 0 ? filename.slice(0, dotIndex) : filename) || 'file';

    return `${randomUUID()}-${base}${extension}`;
  }
}
