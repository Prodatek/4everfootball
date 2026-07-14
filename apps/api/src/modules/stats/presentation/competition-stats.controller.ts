import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { StatsService } from '../application/stats.service';

@ApiTags('stats')
@Controller('competitions')
export class CompetitionStatsController {
  constructor(private readonly statsService: StatsService) {}

  @Public()
  @Get(':id/top-scorers')
  getTopScorers(@Param('id') id: string) {
    return this.statsService.getTopScorers(id);
  }

  @Public()
  @Get(':id/top-assists')
  getTopAssists(@Param('id') id: string) {
    return this.statsService.getTopAssists(id);
  }
}
