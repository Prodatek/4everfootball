import { Injectable, NotFoundException } from '@nestjs/common';
import { CompetitionsService } from '../../competitions/application/competitions.service';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import {
  computeStandings,
  type StandingsFixtureInput,
} from '../domain/standings-calculator';

const MAX_FIXTURES_PER_COMPETITION = 1000;

@Injectable()
export class StandingsService {
  constructor(
    private readonly competitionsService: CompetitionsService,
    private readonly fixturesService: FixturesService,
  ) {}

  async getTable(competitionId: string) {
    const competitionExists =
      await this.competitionsService.exists(competitionId);

    if (!competitionExists) {
      throw new NotFoundException('Competition not found');
    }

    const entries = await this.competitionsService.listEntries(competitionId);

    const finishedFixtures = await this.fixturesService.list({
      competitionId,
      status: 'FINISHED',
      page: 1,
      limit: MAX_FIXTURES_PER_COMPETITION,
      sortBy: 'kickoffAt',
      sortOrder: 'asc',
    } as never);

    const fixtures =
      finishedFixtures.data as unknown as StandingsFixtureInput[];

    return computeStandings(
      entries.map((entry) => ({
        teamId: entry.teamId,
        name: entry.name,
        slug: entry.slug,
        logoUrl: entry.logoUrl,
      })),
      fixtures,
    );
  }
}
