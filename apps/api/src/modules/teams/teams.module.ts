import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { TEAM_REPOSITORY } from './domain/team.repository';
import { PrismaTeamRepository } from './infrastructure/prisma-team.repository';
import { TeamsService } from './application/teams.service';
import { TeamsController } from './presentation/teams.controller';

@Module({
  imports: [SearchModule],
  controllers: [TeamsController],
  providers: [
    TeamsService,
    { provide: TEAM_REPOSITORY, useClass: PrismaTeamRepository },
  ],
  exports: [TeamsService],
})
export class TeamsModule {}
