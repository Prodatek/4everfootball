import { Injectable, NotFoundException } from '@nestjs/common';
import { CompetitionsService } from '../../competitions/application/competitions.service';
import { MatchEventsService } from '../../matches/application/match-events.service';
import { PlayersService } from '../../players/application/players.service';
import {
  aggregatePlayerStats,
  aggregateTopAssists,
  aggregateTopScorers,
  type StatsEventInput,
} from '../domain/stats-aggregator';

@Injectable()
export class StatsService {
  constructor(
    private readonly competitionsService: CompetitionsService,
    private readonly matchEventsService: MatchEventsService,
    private readonly playersService: PlayersService,
  ) {}

  async getTopScorers(competitionId: string) {
    await this.assertCompetitionExists(competitionId);
    const events = await this.matchEventsService.listForCompetition(
      competitionId,
      ['GOAL', 'PENALTY_SCORED'],
    );
    return aggregateTopScorers(events as StatsEventInput[]);
  }

  async getTopAssists(competitionId: string) {
    await this.assertCompetitionExists(competitionId);
    const events = await this.matchEventsService.listForCompetition(
      competitionId,
      ['GOAL'],
    );
    return aggregateTopAssists(events as StatsEventInput[]);
  }

  async getPlayerStats(playerSlug: string, competitionId?: string) {
    const player = await this.playersService.getBySlug(playerSlug);
    const events = await this.matchEventsService.listForPlayer(
      player.id,
      competitionId,
    );
    return aggregatePlayerStats(events as StatsEventInput[], player.id);
  }

  private async assertCompetitionExists(competitionId: string) {
    const exists = await this.competitionsService.exists(competitionId);

    if (!exists) {
      throw new NotFoundException('Competition not found');
    }
  }
}
