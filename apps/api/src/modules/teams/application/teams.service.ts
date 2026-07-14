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
import { TEAM_REPOSITORY } from '../domain/team.repository';
import type { TeamRepository } from '../domain/team.repository';
import type { CreateTeamDto } from './dto/create-team.dto';
import type { QueryTeamsDto } from './dto/query-teams.dto';
import type { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(TEAM_REPOSITORY) private readonly teamRepository: TeamRepository,
  ) {}

  async list(query: QueryTeamsDto): Promise<PaginatedResult<unknown>> {
    return this.findPaginated(query, false);
  }

  async listForAdmin(query: QueryTeamsDto): Promise<PaginatedResult<unknown>> {
    return this.findPaginated(query, true);
  }

  private async findPaginated(query: QueryTeamsDto, includeInactive: boolean) {
    const { items, total } = await this.teamRepository.findMany({
      page: query.page,
      limit: query.limit,
      search: query.search,
      country: query.country,
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

  async exists(id: string): Promise<boolean> {
    const team = await this.teamRepository.findById(id);
    return team !== null;
  }

  async getBySlug(slug: string) {
    const team = await this.teamRepository.findBySlug(slug);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team.toPublic();
  }

  async create(dto: CreateTeamDto) {
    const slug = await this.generateUniqueSlug(dto.name);
    const team = await this.teamRepository.create({ ...dto, slug });
    return team.toPublic();
  }

  async update(id: string, dto: UpdateTeamDto) {
    const existing = await this.teamRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Team not found');
    }

    const team = await this.teamRepository.update(id, dto);
    return team.toPublic();
  }

  async remove(id: string) {
    const existing = await this.teamRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Team not found');
    }

    await this.teamRepository.delete(id);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);

    if (!base) {
      throw new ConflictException(
        'Team name must contain at least one letter or number',
      );
    }

    let candidate = base;
    let suffix = 2;

    while (await this.teamRepository.slugExists(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
