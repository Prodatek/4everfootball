import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  paginate,
  type PaginatedResult,
} from '../../../common/dto/paginated-result';
import { slugify } from '../../../common/utils/slugify';
import { TeamsService } from '../../teams/application/teams.service';
import { COMPETITION_REPOSITORY } from '../domain/competition.repository';
import type { CompetitionRepository } from '../domain/competition.repository';
import type { CreateCompetitionDto } from './dto/create-competition.dto';
import type { QueryCompetitionsDto } from './dto/query-competitions.dto';
import type { UpdateCompetitionDto } from './dto/update-competition.dto';

@Injectable()
export class CompetitionsService {
  constructor(
    @Inject(COMPETITION_REPOSITORY)
    private readonly competitionRepository: CompetitionRepository,
    private readonly teamsService: TeamsService,
  ) {}

  async list(query: QueryCompetitionsDto): Promise<PaginatedResult<unknown>> {
    return this.findPaginated(query, false);
  }

  async listForAdmin(
    query: QueryCompetitionsDto,
  ): Promise<PaginatedResult<unknown>> {
    return this.findPaginated(query, true);
  }

  private async findPaginated(
    query: QueryCompetitionsDto,
    includeInactive: boolean,
  ) {
    const { items, total } = await this.competitionRepository.findMany({
      page: query.page,
      limit: query.limit,
      search: query.search,
      type: query.type,
      country: query.country,
      season: query.season,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      includeInactive,
    });

    return paginate(
      items.map((item) => item.toPublic()),
      total,
      query.page,
      query.limit,
    );
  }

  async getBySlug(slug: string) {
    const competition = await this.competitionRepository.findBySlug(slug);

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    return competition.toPublic();
  }

  async create(dto: CreateCompetitionDto) {
    const slug = await this.generateUniqueSlug(`${dto.name} ${dto.season}`);
    const competition = await this.competitionRepository.create({
      ...dto,
      slug,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    return competition.toPublic();
  }

  async update(id: string, dto: UpdateCompetitionDto) {
    const existing = await this.competitionRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Competition not found');
    }

    const competition = await this.competitionRepository.update(id, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    return competition.toPublic();
  }

  async remove(id: string) {
    const existing = await this.competitionRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Competition not found');
    }

    await this.competitionRepository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const competition = await this.competitionRepository.findById(id);
    return competition !== null;
  }

  async isTeamEntered(competitionId: string, teamId: string): Promise<boolean> {
    return this.competitionRepository.entryExists(competitionId, teamId);
  }

  async listEntries(competitionId: string) {
    await this.assertCompetitionExists(competitionId);
    return this.competitionRepository.listEntries(competitionId);
  }

  async addEntry(competitionId: string, teamId: string) {
    await this.assertCompetitionExists(competitionId);

    const teamExists = await this.teamsService.exists(teamId);

    if (!teamExists) {
      throw new NotFoundException('Team not found');
    }

    await this.competitionRepository.addEntry(competitionId, teamId);
    return this.competitionRepository.listEntries(competitionId);
  }

  async removeEntry(competitionId: string, teamId: string) {
    await this.assertCompetitionExists(competitionId);
    await this.competitionRepository.removeEntry(competitionId, teamId);
    return this.competitionRepository.listEntries(competitionId);
  }

  private async assertCompetitionExists(id: string) {
    const competition = await this.competitionRepository.findById(id);

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);

    if (!base) {
      throw new ConflictException(
        'Competition name must contain at least one letter or number',
      );
    }

    let candidate = base;
    let suffix = 2;

    while (await this.competitionRepository.slugExists(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
