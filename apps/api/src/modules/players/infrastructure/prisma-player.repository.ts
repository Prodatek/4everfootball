import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PlayerEntity } from '../domain/player.entity';
import type {
  CreatePlayerInput,
  PlayerListFilters,
  PlayerListResult,
  PlayerRepository,
  UpdatePlayerInput,
} from '../domain/player.repository';

const teamInclude = {
  team: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class PrismaPlayerRepository implements PlayerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: PlayerListFilters): Promise<PlayerListResult> {
    const where: Prisma.PlayerWhereInput = {
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.teamId ? { teamId: filters.teamId } : {}),
      ...(filters.position ? { position: filters.position } : {}),
      ...(filters.nationality ? { nationality: filters.nationality } : {}),
      ...(filters.search
        ? {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.player.findMany({
        where,
        include: teamInclude,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.player.count({ where }),
    ]);

    return { items: items.map((item) => new PlayerEntity(item)), total };
  }

  async findById(id: string): Promise<PlayerEntity | null> {
    const record = await this.prisma.player.findUnique({
      where: { id },
      include: teamInclude,
    });
    return record ? new PlayerEntity(record) : null;
  }

  async findBySlug(slug: string): Promise<PlayerEntity | null> {
    const record = await this.prisma.player.findUnique({
      where: { slug },
      include: teamInclude,
    });
    return record ? new PlayerEntity(record) : null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const record = await this.prisma.player.findUnique({
      where: { slug },
      select: { id: true },
    });
    return record !== null;
  }

  async create(input: CreatePlayerInput): Promise<PlayerEntity> {
    const record = await this.prisma.player.create({
      data: input,
      include: teamInclude,
    });
    return new PlayerEntity(record);
  }

  async update(id: string, input: UpdatePlayerInput): Promise<PlayerEntity> {
    try {
      const record = await this.prisma.player.update({
        where: { id },
        data: input,
        include: teamInclude,
      });
      return new PlayerEntity(record);
    } catch {
      throw new NotFoundException('Player not found');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.player.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Player not found');
    }
  }
}
