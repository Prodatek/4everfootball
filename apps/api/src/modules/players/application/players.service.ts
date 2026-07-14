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
import { PLAYER_REPOSITORY } from '../domain/player.repository';
import type { PlayerRepository } from '../domain/player.repository';
import type { CreatePlayerDto } from './dto/create-player.dto';
import type { QueryPlayersDto } from './dto/query-players.dto';
import type { UpdatePlayerDto } from './dto/update-player.dto';

@Injectable()
export class PlayersService {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
    private readonly teamsService: TeamsService,
  ) {}

  async list(query: QueryPlayersDto): Promise<PaginatedResult<unknown>> {
    return this.findPaginated(query, false);
  }

  async listForAdmin(
    query: QueryPlayersDto,
  ): Promise<PaginatedResult<unknown>> {
    return this.findPaginated(query, true);
  }

  private async findPaginated(
    query: QueryPlayersDto,
    includeInactive: boolean,
  ) {
    const { items, total } = await this.playerRepository.findMany({
      page: query.page,
      limit: query.limit,
      search: query.search,
      teamId: query.teamId,
      position: query.position,
      nationality: query.nationality,
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
    const player = await this.playerRepository.findBySlug(slug);

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player.toPublic();
  }

  async create(dto: CreatePlayerDto) {
    if (dto.teamId) {
      await this.assertTeamExists(dto.teamId);
    }

    const slug = await this.generateUniqueSlug(dto.firstName, dto.lastName);
    const player = await this.playerRepository.create({
      ...dto,
      slug,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });

    return player.toPublic();
  }

  async update(id: string, dto: UpdatePlayerDto) {
    const existing = await this.playerRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Player not found');
    }

    if (dto.teamId) {
      await this.assertTeamExists(dto.teamId);
    }

    const player = await this.playerRepository.update(id, {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });

    return player.toPublic();
  }

  async remove(id: string) {
    const existing = await this.playerRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Player not found');
    }

    await this.playerRepository.delete(id);
  }

  private async assertTeamExists(teamId: string) {
    const exists = await this.teamsService.exists(teamId);

    if (!exists) {
      throw new NotFoundException('Team not found');
    }
  }

  private async generateUniqueSlug(
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const base = slugify(`${firstName} ${lastName}`);

    if (!base) {
      throw new ConflictException(
        'Player name must contain at least one letter or number',
      );
    }

    let candidate = base;
    let suffix = 2;

    while (await this.playerRepository.slugExists(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
