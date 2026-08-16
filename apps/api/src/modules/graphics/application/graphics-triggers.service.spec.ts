import { Test } from '@nestjs/testing';
import { GraphicsTriggersService } from './graphics-triggers.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StandingsService } from '../../standings/application/standings.service';
import { StatsService } from '../../stats/application/stats.service';
import { GraphicsService } from './graphics.service';

function fakePrisma() {
  return {
    fixture: { findMany: jest.fn().mockResolvedValue([]) },
    competition: { findMany: jest.fn().mockResolvedValue([]) },
    player: { findMany: jest.fn().mockResolvedValue([]) },
    matchEvent: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('GraphicsTriggersService', () => {
  let service: GraphicsTriggersService;
  let prisma: ReturnType<typeof fakePrisma>;
  let standings: jest.Mocked<StandingsService>;
  let stats: jest.Mocked<StatsService>;
  let graphics: jest.Mocked<GraphicsService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GraphicsTriggersService,
        { provide: PrismaService, useValue: prisma },
        { provide: StandingsService, useValue: { getForm: jest.fn() } },
        { provide: StatsService, useValue: { getTopScorers: jest.fn() } },
        { provide: GraphicsService, useValue: { enqueue: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(GraphicsTriggersService);
    standings = moduleRef.get(StandingsService);
    stats = moduleRef.get(StatsService);
    graphics = moduleRef.get(GraphicsService);
  });

  describe('triggerMatchdayFixtures', () => {
    it('groups fixtures by competition and enqueues one MATCHDAY_FIXTURES graphic per competition', async () => {
      prisma.fixture.findMany.mockResolvedValue([
        {
          id: 'f1',
          competitionId: 'comp-1',
          kickoffAt: new Date(),
          homeTeam: { name: 'Home A' },
          awayTeam: { name: 'Away A' },
          competition: { name: 'Comp One' },
        },
        {
          id: 'f2',
          competitionId: 'comp-1',
          kickoffAt: new Date(),
          homeTeam: { name: 'Home B' },
          awayTeam: { name: 'Away B' },
          competition: { name: 'Comp One' },
        },
        {
          id: 'f3',
          competitionId: 'comp-2',
          kickoffAt: new Date(),
          homeTeam: { name: 'Home C' },
          awayTeam: { name: 'Away C' },
          competition: { name: 'Comp Two' },
        },
      ]);

      await service.triggerMatchdayFixtures();

      expect(graphics.enqueue).toHaveBeenCalledTimes(2);
      const compOneCall = graphics.enqueue.mock.calls.find(
        (call) => call[0].competitionId === 'comp-1',
      )?.[0];
      expect((compOneCall?.data.fixtures as unknown[]).length).toBe(2);
    });

    it('enqueues nothing when there are no fixtures scheduled today', async () => {
      prisma.fixture.findMany.mockResolvedValue([]);
      await service.triggerMatchdayFixtures();
      expect(graphics.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('triggerHeadToHead', () => {
    it('enqueues one HEAD_TO_HEAD graphic per fixture scheduled tomorrow, with the home team recent form', async () => {
      prisma.fixture.findMany.mockResolvedValue([
        {
          id: 'f1',
          competitionId: 'comp-1',
          homeTeamId: 'home-1',
          awayTeamId: 'away-1',
          kickoffAt: new Date(),
          homeTeam: { name: 'Home A', logoUrl: null },
          awayTeam: { name: 'Away A', logoUrl: null },
          competition: { name: 'Comp One' },
        },
      ]);
      standings.getForm.mockResolvedValue([
        { teamId: 'home-1', results: ['W', 'W', 'D'] },
      ] as never);

      await service.triggerHeadToHead();

      expect(graphics.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'HEAD_TO_HEAD',
          subjectId: 'f1',
          data: expect.objectContaining({ recentForm: ['W', 'W', 'D'] }),
        }),
      );
    });

    it('falls back to empty form when StandingsService throws (e.g. competition not found)', async () => {
      prisma.fixture.findMany.mockResolvedValue([
        {
          id: 'f1',
          competitionId: 'comp-1',
          homeTeamId: 'home-1',
          awayTeamId: 'away-1',
          kickoffAt: new Date(),
          homeTeam: { name: 'Home A', logoUrl: null },
          awayTeam: { name: 'Away A', logoUrl: null },
          competition: { name: 'Comp One' },
        },
      ]);
      standings.getForm.mockRejectedValue(new Error('not found'));

      await service.triggerHeadToHead();

      expect(graphics.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recentForm: [] }),
        }),
      );
    });
  });

  describe('triggerWeeklyStats', () => {
    it('skips TOP_SCORERS enqueue for a competition with no scorers', async () => {
      prisma.competition.findMany.mockResolvedValue([
        { id: 'comp-1', name: 'Comp One' },
      ]);
      stats.getTopScorers.mockResolvedValue([]);

      await service.triggerWeeklyStats();

      expect(graphics.enqueue).not.toHaveBeenCalledWith(
        expect.objectContaining({ template: 'TOP_SCORERS' }),
      );
    });

    it('enqueues TOP_SCORERS with team names joined from Player.team', async () => {
      prisma.competition.findMany.mockResolvedValue([
        { id: 'comp-1', name: 'Comp One' },
      ]);
      stats.getTopScorers.mockResolvedValue([
        {
          playerId: 'p1',
          playerName: 'Chuka Obi',
          playerSlug: 'chuka-obi',
          count: 5,
        },
      ]);
      prisma.player.findMany.mockResolvedValue([
        { id: 'p1', team: { name: 'Ikorodu FC' } },
      ]);

      await service.triggerWeeklyStats();

      expect(graphics.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'TOP_SCORERS',
          data: expect.objectContaining({
            scorers: [
              { playerName: 'Chuka Obi', teamName: 'Ikorodu FC', goals: 5 },
            ],
          }),
        }),
      );
    });

    it('picks the player with the highest weighted goals+assists score for PLAYER_OF_WEEK', async () => {
      prisma.competition.findMany.mockResolvedValue([
        { id: 'comp-1', name: 'Comp One' },
      ]);
      stats.getTopScorers.mockResolvedValue([]);
      prisma.matchEvent.findMany
        .mockResolvedValueOnce([
          // goals
          {
            playerId: 'p1',
            player: {
              firstName: 'A',
              lastName: 'One',
              team: { name: 'T1' },
              photoUrl: null,
            },
          },
          {
            playerId: 'p2',
            player: {
              firstName: 'B',
              lastName: 'Two',
              team: { name: 'T2' },
              photoUrl: null,
            },
          },
          {
            playerId: 'p2',
            player: {
              firstName: 'B',
              lastName: 'Two',
              team: { name: 'T2' },
              photoUrl: null,
            },
          },
        ])
        .mockResolvedValueOnce([
          // assists
          {
            assistPlayerId: 'p1',
            assistPlayer: {
              firstName: 'A',
              lastName: 'One',
              team: { name: 'T1' },
              photoUrl: null,
            },
          },
          {
            assistPlayerId: 'p1',
            assistPlayer: {
              firstName: 'A',
              lastName: 'One',
              team: { name: 'T1' },
              photoUrl: null,
            },
          },
          {
            assistPlayerId: 'p1',
            assistPlayer: {
              firstName: 'A',
              lastName: 'One',
              team: { name: 'T1' },
              photoUrl: null,
            },
          },
        ]);

      await service.triggerWeeklyStats();

      // p1: 1 goal + 3 assists = 2*1+3=5. p2: 2 goals + 0 assists = 2*2+0=4. p1 wins.
      expect(graphics.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'PLAYER_OF_WEEK',
          subjectId: 'p1',
          data: expect.objectContaining({
            playerName: 'A One',
            goals: 1,
            assists: 3,
          }),
        }),
      );
    });

    it('skips PLAYER_OF_WEEK entirely when there are no goals or assists in the window', async () => {
      prisma.competition.findMany.mockResolvedValue([
        { id: 'comp-1', name: 'Comp One' },
      ]);
      stats.getTopScorers.mockResolvedValue([]);
      prisma.matchEvent.findMany.mockResolvedValue([]);

      await service.triggerWeeklyStats();

      expect(graphics.enqueue).not.toHaveBeenCalledWith(
        expect.objectContaining({ template: 'PLAYER_OF_WEEK' }),
      );
    });
  });
});
