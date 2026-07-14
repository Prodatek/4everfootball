import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { SearchModule } from '../search/search.module';
import { COMPETITION_REPOSITORY } from './domain/competition.repository';
import { PrismaCompetitionRepository } from './infrastructure/prisma-competition.repository';
import { CompetitionsService } from './application/competitions.service';
import { CompetitionsController } from './presentation/competitions.controller';

@Module({
  imports: [TeamsModule, SearchModule],
  controllers: [CompetitionsController],
  providers: [
    CompetitionsService,
    { provide: COMPETITION_REPOSITORY, useClass: PrismaCompetitionRepository },
  ],
  exports: [CompetitionsService],
})
export class CompetitionsModule {}
