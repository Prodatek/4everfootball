import { Module } from '@nestjs/common';
import { FixturesModule } from '../fixtures/fixtures.module';
import { PlayersModule } from '../players/players.module';
import { MATCH_EVENT_REPOSITORY } from './domain/match-event.repository';
import { PrismaMatchEventRepository } from './infrastructure/prisma-match-event.repository';
import { MatchEventsService } from './application/match-events.service';
import { AutoKickoffService } from './application/auto-kickoff.service';
import { MatchEventsGateway } from './infrastructure/match-events.gateway';
import { MatchEventsController } from './presentation/match-events.controller';

@Module({
  imports: [FixturesModule, PlayersModule],
  controllers: [MatchEventsController],
  providers: [
    MatchEventsService,
    AutoKickoffService,
    MatchEventsGateway,
    { provide: MATCH_EVENT_REPOSITORY, useClass: PrismaMatchEventRepository },
  ],
  exports: [MatchEventsService],
})
export class MatchesModule {}
