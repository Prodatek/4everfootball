import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { StatsService } from '../application/stats.service';

class PlayerStatsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  competitionId?: string;
}

@ApiTags('stats')
@Controller('players')
export class PlayerStatsController {
  constructor(private readonly statsService: StatsService) {}

  @Public()
  @Get(':slug/stats')
  getPlayerStats(
    @Param('slug') slug: string,
    @Query() query: PlayerStatsQuery,
  ) {
    return this.statsService.getPlayerStats(slug, query.competitionId);
  }
}
