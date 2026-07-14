import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FixtureEntity } from '../domain/fixture.entity';
import type {
  CreateFixtureInput,
  FixtureListFilters,
  FixtureListResult,
  FixtureRepository,
  UpdateFixtureInput,
} from '../domain/fixture.repository';

const teamSelect = { id: true, name: true, slug: true, logoUrl: true } as const;
const fixtureInclude = {
  competition: { select: { id: true, name: true, slug: true } },
  homeTeam: { select: teamSelect },
  awayTeam: { select: teamSelect },
} as const;

@Injectable()
export class PrismaFixtureRepository implements FixtureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: FixtureListFilters): Promise<FixtureListResult> {
    const where: Prisma.FixtureWhereInput = {
      ...(filters.competitionId
        ? { competitionId: filters.competitionId }
        : {}),
      ...(filters.teamId
        ? {
            OR: [
              { homeTeamId: filters.teamId },
              { awayTeamId: filters.teamId },
            ],
          }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            kickoffAt: {
              ...(filters.fromDate ? { gte: filters.fromDate } : {}),
              ...(filters.toDate ? { lte: filters.toDate } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.fixture.findMany({
        where,
        include: fixtureInclude,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.fixture.count({ where }),
    ]);

    return { items: items.map((item) => new FixtureEntity(item)), total };
  }

  async findById(id: string): Promise<FixtureEntity | null> {
    const record = await this.prisma.fixture.findUnique({
      where: { id },
      include: fixtureInclude,
    });
    return record ? new FixtureEntity(record) : null;
  }

  async create(input: CreateFixtureInput): Promise<FixtureEntity> {
    const record = await this.prisma.fixture.create({
      data: input,
      include: fixtureInclude,
    });
    return new FixtureEntity(record);
  }

  async update(id: string, input: UpdateFixtureInput): Promise<FixtureEntity> {
    try {
      const record = await this.prisma.fixture.update({
        where: { id },
        data: input,
        include: fixtureInclude,
      });
      return new FixtureEntity(record);
    } catch {
      throw new NotFoundException('Fixture not found');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.fixture.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Fixture not found');
    }
  }
}
