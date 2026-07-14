import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FixtureStatus } from '@prisma/client';
import {
  paginate,
  type PaginatedResult,
} from '../../../common/dto/paginated-result';
import type { PrismaTransactionClient } from '../../../common/prisma/prisma-transaction.type';
import { TeamsService } from '../../teams/application/teams.service';
import { CompetitionsService } from '../../competitions/application/competitions.service';
import { FIXTURE_REPOSITORY } from '../domain/fixture.repository';
import type { FixtureRepository } from '../domain/fixture.repository';
import type { CreateFixtureDto } from './dto/create-fixture.dto';
import type { QueryFixturesDto } from './dto/query-fixtures.dto';
import type { UpdateFixtureDto } from './dto/update-fixture.dto';

@Injectable()
export class FixturesService {
  constructor(
    @Inject(FIXTURE_REPOSITORY)
    private readonly fixtureRepository: FixtureRepository,
    private readonly teamsService: TeamsService,
    private readonly competitionsService: CompetitionsService,
  ) {}

  async list(query: QueryFixturesDto): Promise<PaginatedResult<unknown>> {
    const { items, total } = await this.fixtureRepository.findMany({
      page: query.page,
      limit: query.limit,
      competitionId: query.competitionId,
      teamId: query.teamId,
      status: query.status,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return paginate(
      items.map((item) => item.toPublic()),
      total,
      query.page,
      query.limit,
    );
  }

  async getById(id: string) {
    const fixture = await this.fixtureRepository.findById(id);

    if (!fixture) {
      throw new NotFoundException('Fixture not found');
    }

    return fixture.toPublic();
  }

  async create(dto: CreateFixtureDto) {
    if (dto.homeTeamId === dto.awayTeamId) {
      throw new BadRequestException('A team cannot play itself');
    }

    const competitionExists = await this.competitionsService.exists(
      dto.competitionId,
    );

    if (!competitionExists) {
      throw new NotFoundException('Competition not found');
    }

    for (const teamId of [dto.homeTeamId, dto.awayTeamId]) {
      const teamExists = await this.teamsService.exists(teamId);

      if (!teamExists) {
        throw new NotFoundException('Team not found');
      }

      const isEntered = await this.competitionsService.isTeamEntered(
        dto.competitionId,
        teamId,
      );

      if (!isEntered) {
        throw new BadRequestException(
          'Both teams must be entered in the competition before scheduling a fixture',
        );
      }
    }

    const fixture = await this.fixtureRepository.create({
      competitionId: dto.competitionId,
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      kickoffAt: new Date(dto.kickoffAt),
      venueName: dto.venueName,
      matchday: dto.matchday,
    });

    return fixture.toPublic();
  }

  async update(id: string, dto: UpdateFixtureDto) {
    const existing = await this.fixtureRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Fixture not found');
    }

    const fixture = await this.fixtureRepository.update(id, {
      ...dto,
      kickoffAt: dto.kickoffAt ? new Date(dto.kickoffAt) : undefined,
    });

    return fixture.toPublic();
  }

  async remove(id: string) {
    const existing = await this.fixtureRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Fixture not found');
    }

    await this.fixtureRepository.delete(id);
  }

  /**
   * Internal write path for the match engine: recomputed score + status
   * transitions driven by recorded match events, not admin-submitted DTOs.
   * Accepts an optional transaction client so the caller can keep this update
   * atomic with the match event insert/delete that triggered it.
   */
  async applyMatchEngineUpdate(
    id: string,
    data: { homeScore: number; awayScore: number; status?: FixtureStatus },
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    await this.fixtureRepository.update(id, data, tx);
  }
}
