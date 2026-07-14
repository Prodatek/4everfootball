import { Injectable, NotFoundException } from '@nestjs/common';
import { CompetitionsService } from '../../competitions/application/competitions.service';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import { computeStandings } from '../domain/standings-calculator';
import { computeForm } from '../domain/form-calculator';

const MAX_FIXTURES_PER_COMPETITION = 1000;

interface FinishedFixtureData {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoffAt: string;
}

@Injectable()
export class StandingsService {
  constructor(
    private readonly competitionsService: CompetitionsService,
    private readonly fixturesService: FixturesService,
  ) {}

  async getTable(competitionId: string) {
    const { entries, fixtures } =
      await this.getFinishedCompetitionData(competitionId);

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

  async getForm(competitionId: string, limit?: number) {
    const { entries, fixtures } =
      await this.getFinishedCompetitionData(competitionId);

    return computeForm(
      entries.map((entry) => ({ teamId: entry.teamId })),
      fixtures,
      limit,
    );
  }

  private async getFinishedCompetitionData(competitionId: string) {
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

    return {
      entries,
      fixtures: finishedFixtures.data as unknown as FinishedFixtureData[],
    };
  }
}
