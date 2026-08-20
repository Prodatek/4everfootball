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
import { SearchService } from '../../search/application/search.service';
import { TEAM_REPOSITORY } from '../domain/team.repository';
import type { TeamRepository } from '../domain/team.repository';
import type { CreateTeamDto } from './dto/create-team.dto';
import type { QueryTeamsDto } from './dto/query-teams.dto';
import type { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(TEAM_REPOSITORY) private readonly teamRepository: TeamRepository,
    private readonly searchService: SearchService,
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
      unclaimed: query.unclaimed,
      organisationId: query.organisationId,
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
    const publicTeam = team.toPublic();

    void this.searchService.indexTeam({
      id: publicTeam.id,
      name: publicTeam.name,
      slug: publicTeam.slug,
      country: publicTeam.country,
      logoUrl: publicTeam.logoUrl,
    });

    return publicTeam;
  }

  async update(id: string, dto: UpdateTeamDto) {
    const existing = await this.teamRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Team not found');
    }

    const team = await this.teamRepository.update(id, dto);
    const publicTeam = team.toPublic();

    if (publicTeam.isActive) {
      void this.searchService.indexTeam({
        id: publicTeam.id,
        name: publicTeam.name,
        slug: publicTeam.slug,
        country: publicTeam.country,
        logoUrl: publicTeam.logoUrl,
      });
    } else {
      void this.searchService.deleteTeam(publicTeam.id);
    }

    return publicTeam;
  }

  async remove(id: string) {
    const existing = await this.teamRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Team not found');
    }

    await this.teamRepository.delete(id);
    void this.searchService.deleteTeam(id);
  }

  /**
   * §5 B2 of MONETISATION_UI_BRIEF.md: a new club account attaches an
   * existing, unclaimed team to their organisation. One-way and one-time —
   * a team that's already claimed can't be claimed again (not even by a
   * platform admin through this method; that's a plain PATCH if it's ever
   * genuinely needed), so a club can't silently steal another club's team
   * by racing a claim.
   */
  async claim(teamId: string, organisationId: string) {
    const existing = await this.teamRepository.findById(teamId);

    if (!existing) {
      throw new NotFoundException('Team not found');
    }

    if (existing.toPublic().organisationId) {
      throw new ConflictException('This team already belongs to a club account');
    }

    const team = await this.teamRepository.update(teamId, { organisationId });
    return team.toPublic();
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
