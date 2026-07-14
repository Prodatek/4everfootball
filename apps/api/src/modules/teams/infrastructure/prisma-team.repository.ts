import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TeamEntity } from '../domain/team.entity';
import type {
  CreateTeamInput,
  TeamListFilters,
  TeamListResult,
  TeamRepository,
  UpdateTeamInput,
} from '../domain/team.repository';

@Injectable()
export class PrismaTeamRepository implements TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: TeamListFilters): Promise<TeamListResult> {
    const where: Prisma.TeamWhereInput = {
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' } }
        : {}),
      ...(filters.country ? { country: filters.country } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.team.count({ where }),
    ]);

    return { items: items.map((item) => new TeamEntity(item)), total };
  }

  async findById(id: string): Promise<TeamEntity | null> {
    const record = await this.prisma.team.findUnique({ where: { id } });
    return record ? new TeamEntity(record) : null;
  }

  async findBySlug(slug: string): Promise<TeamEntity | null> {
    const record = await this.prisma.team.findUnique({ where: { slug } });
    return record ? new TeamEntity(record) : null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const record = await this.prisma.team.findUnique({
      where: { slug },
      select: { id: true },
    });
    return record !== null;
  }

  async create(input: CreateTeamInput): Promise<TeamEntity> {
    const record = await this.prisma.team.create({ data: input });
    return new TeamEntity(record);
  }

  async update(id: string, input: UpdateTeamInput): Promise<TeamEntity> {
    try {
      const record = await this.prisma.team.update({
        where: { id },
        data: input,
      });
      return new TeamEntity(record);
    } catch {
      throw new NotFoundException('Team not found');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.team.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Team not found');
    }
  }
}
