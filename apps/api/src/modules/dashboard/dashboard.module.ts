import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { PlayersModule } from '../players/players.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { FixturesModule } from '../fixtures/fixtures.module';
import { NewsModule } from '../news/news.module';
import { UsersModule } from '../users/users.module';
import { DashboardService } from './application/dashboard.service';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  imports: [
    TeamsModule,
    PlayersModule,
    CompetitionsModule,
    FixturesModule,
    NewsModule,
    UsersModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
