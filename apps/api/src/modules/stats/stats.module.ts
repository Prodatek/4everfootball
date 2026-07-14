import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../competitions/competitions.module';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { StatsService } from './application/stats.service';
import { CompetitionStatsController } from './presentation/competition-stats.controller';
import { PlayerStatsController } from './presentation/player-stats.controller';

@Module({
  imports: [CompetitionsModule, MatchesModule, PlayersModule],
  controllers: [CompetitionStatsController, PlayerStatsController],
  providers: [StatsService],
})
export class StatsModule {}
