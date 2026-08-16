import { Module } from '@nestjs/common';
import { GraphicsModule } from './graphics.module';
import { StandingsModule } from '../standings/standings.module';
import { StatsModule } from '../stats/stats.module';
import { GraphicsTriggersService } from './application/graphics-triggers.service';

// Separated from GraphicsModule specifically to avoid a cycle: StatsModule
// depends on MatchesModule, and MatchesModule needs to import GraphicsModule
// directly for its GOAL/FULL_TIME hooks — see the comment on GraphicsModule.
// Nothing imports GraphicsTriggersModule except AppModule, so it's free to
// depend on the calendar-trigger data sources (Standings/Stats) without
// closing that cycle.
@Module({
  imports: [GraphicsModule, StandingsModule, StatsModule],
  providers: [GraphicsTriggersService],
})
export class GraphicsTriggersModule {}
