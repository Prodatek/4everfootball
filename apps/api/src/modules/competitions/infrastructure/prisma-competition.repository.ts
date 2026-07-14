import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CompetitionEntity } from '../domain/competition.entity';
import type {
  CompetitionEntryRecord,
  CompetitionListFilters,
  CompetitionListResult,
  CompetitionRepository,
  CreateCompetitionInput,
  UpdateCompetitionInput,
} from '../domain/competition.repository';

@Injectable()
export class PrismaCompetitionRepository implements CompetitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filters: CompetitionListFilters,
  ): Promise<CompetitionListResult> {
    const where: Prisma.CompetitionWhereInput = {
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.country ? { country: filters.country } : {}),
      ...(filters.season ? { season: filters.season } : {}),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.competition.findMany({
        where,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.competition.count({ where }),
    ]);

    return { items: items.map((item) => new CompetitionEntity(item)), total };
  }

  async findById(id: string): Promise<CompetitionEntity | null> {
    const record = await this.prisma.competition.findUnique({ where: { id } });
    return record ? new CompetitionEntity(record) : null;
  }

  async findBySlug(slug: string): Promise<CompetitionEntity | null> {
    const record = await this.prisma.competition.findUnique({
      where: { slug },
    });
    return record ? new CompetitionEntity(record) : null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const record = await this.prisma.competition.findUnique({
      where: { slug },
      select: { id: true },
    });
    return record !== null;
  }

  async create(input: CreateCompetitionInput): Promise<CompetitionEntity> {
    const record = await this.prisma.competition.create({ data: input });
    return new CompetitionEntity(record);
  }

  async update(
    id: string,
    input: UpdateCompetitionInput,
  ): Promise<CompetitionEntity> {
    try {
      const record = await this.prisma.competition.update({
        where: { id },
        data: input,
      });
      return new CompetitionEntity(record);
    } catch {
      throw new NotFoundException('Competition not found');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.competition.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Competition not found');
    }
  }

  async listEntries(competitionId: string): Promise<CompetitionEntryRecord[]> {
    const entries = await this.prisma.competitionEntry.findMany({
      where: { competitionId },
      include: {
        team: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
      orderBy: { team: { name: 'asc' } },
    });

    return entries.map((entry) => ({
      entryId: entry.id,
      teamId: entry.team.id,
      name: entry.team.name,
      slug: entry.team.slug,
      logoUrl: entry.team.logoUrl,
      joinedAt: entry.joinedAt,
    }));
  }

  async entryExists(competitionId: string, teamId: string): Promise<boolean> {
    const entry = await this.prisma.competitionEntry.findUnique({
      where: { competitionId_teamId: { competitionId, teamId } },
      select: { id: true },
    });
    return entry !== null;
  }

  async addEntry(competitionId: string, teamId: string): Promise<void> {
    try {
      await this.prisma.competitionEntry.create({
        data: { competitionId, teamId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Team is already entered in this competition',
        );
      }
      throw error;
    }
  }

  async removeEntry(competitionId: string, teamId: string): Promise<void> {
    try {
      await this.prisma.competitionEntry.delete({
        where: { competitionId_teamId: { competitionId, teamId } },
      });
    } catch {
      throw new NotFoundException('Team is not entered in this competition');
    }
  }
}
