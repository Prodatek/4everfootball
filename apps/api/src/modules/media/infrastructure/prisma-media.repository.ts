import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MediaEntity } from '../domain/media.entity';
import type {
  CreateMediaInput,
  MediaListFilters,
  MediaListResult,
  MediaRepository,
} from '../domain/media.repository';

@Injectable()
export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: MediaListFilters): Promise<MediaListResult> {
    const where: Prisma.MediaWhereInput = {
      ...(filters.kind ? { kind: filters.kind } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.media.count({ where }),
    ]);

    return { items: items.map((item) => new MediaEntity(item)), total };
  }

  async findById(id: string): Promise<MediaEntity | null> {
    const record = await this.prisma.media.findUnique({ where: { id } });
    return record ? new MediaEntity(record) : null;
  }

  async create(input: CreateMediaInput): Promise<MediaEntity> {
    const record = await this.prisma.media.create({ data: input });
    return new MediaEntity(record);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.media.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Media not found');
    }
  }
}
