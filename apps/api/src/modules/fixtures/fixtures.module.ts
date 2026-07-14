import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { FIXTURE_REPOSITORY } from './domain/fixture.repository';
import { PrismaFixtureRepository } from './infrastructure/prisma-fixture.repository';
import { FixturesService } from './application/fixtures.service';
import { FixturesController } from './presentation/fixtures.controller';

@Module({
  imports: [TeamsModule, CompetitionsModule],
  controllers: [FixturesController],
  providers: [
    FixturesService,
    { provide: FIXTURE_REPOSITORY, useClass: PrismaFixtureRepository },
  ],
  exports: [FixturesService],
})
export class FixturesModule {}
