import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../competitions/competitions.module';
import { FixturesModule } from '../fixtures/fixtures.module';
import { StandingsService } from './application/standings.service';
import { StandingsController } from './presentation/standings.controller';

@Module({
  imports: [CompetitionsModule, FixturesModule],
  controllers: [StandingsController],
  providers: [StandingsService],
  exports: [StandingsService],
})
export class StandingsModule {}
