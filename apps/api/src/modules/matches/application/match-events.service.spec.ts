import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MatchEventsService } from './match-events.service';
import { MATCH_EVENT_REPOSITORY } from '../domain/match-event.repository';
import type { MatchEventRepository } from '../domain/match-event.repository';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import { PlayersService } from '../../players/application/players.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MatchEventsGateway } from '../infrastructure/match-events.gateway';
import { GraphicsService } from '../../graphics/application/graphics.service';
import { StandingsService } from '../../standings/application/standings.service';
import { seedHash } from '../domain/event-hash-chain';

const FIXTURE_ID = 'fixture-1';
const HOME_TEAM_ID = 'home-team';
const AWAY_TEAM_ID = 'away-team';
const RECORDED_BY = 'user-1';

const COMPETITION_ID = 'competition-1';

function fakeFixture() {
  return {
    id: FIXTURE_ID,
    competitionId: COMPETITION_ID,
    homeTeamId: HOME_TEAM_ID,
    awayTeamId: AWAY_TEAM_ID,
    status: 'LIVE',
    homeScore: 0,
    awayScore: 0,
  };
}

function fakeEvent(overrides: Partial<Record<string, unknown>> = {}) {
  const props = {
    id: 'event-1',
    fixtureId: FIXTURE_ID,
    type: 'GOAL',
    teamId: HOME_TEAM_ID,
    correctsEventId: null,
    metadata: null,
    hash: 'some-hash',
    ...overrides,
  };
  return {
    ...props,
    fixtureId: props.fixtureId,
    hash: props.hash,
    toPublic: () => props,
    toHashable: () => props,
  };
}

describe('MatchEventsService', () => {
  let service: MatchEventsService;
  let repository: jest.Mocked<MatchEventRepository>;
  let fixturesService: jest.Mocked<FixturesService>;
  let playersService: jest.Mocked<PlayersService>;
  let graphicsService: jest.Mocked<GraphicsService>;
  let standingsService: jest.Mocked<StandingsService>;
  let prisma: {
    playerRegistration: { findUnique: jest.Mock };
    fixture: { findUnique: jest.Mock; count: jest.Mock };
    matchEvent: { count: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MatchEventsService,
        {
          provide: MATCH_EVENT_REPOSITORY,
          useValue: {
            findByFixtureId: jest.fn().mockResolvedValue([]),
            findById: jest.fn(),
            findByClientEventId: jest.fn().mockResolvedValue(null),
            findLastByFixtureId: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          },
        },
        {
          provide: FixturesService,
          useValue: {
            getById: jest.fn().mockResolvedValue(fakeFixture()),
            applyMatchEngineUpdate: jest.fn(),
          },
        },
        {
          provide: PlayersService,
          useValue: { findById: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
              callback({ $queryRaw: jest.fn().mockResolvedValue(undefined) }),
            ),
            playerRegistration: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
            // Defaults to a no-op for the graphics hooks (fixture not
            // found -> triggerGraphicsForEvent returns early) so existing
            // tests that don't care about graphics stay unaffected.
            fixture: {
              findUnique: jest.fn().mockResolvedValue(null),
              count: jest.fn().mockResolvedValue(0),
            },
            matchEvent: {
              count: jest.fn().mockResolvedValue(0),
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
        {
          provide: MatchEventsGateway,
          useValue: {
            broadcastEvent: jest.fn(),
            broadcastEventRemoved: jest.fn(),
            broadcastState: jest.fn(),
          },
        },
        {
          provide: GraphicsService,
          useValue: { enqueue: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: StandingsService,
          useValue: { getTable: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = moduleRef.get(MatchEventsService);
    repository = moduleRef.get(MATCH_EVENT_REPOSITORY);
    fixturesService = moduleRef.get(FixturesService);
    playersService = moduleRef.get(PlayersService);
    graphicsService = moduleRef.get(GraphicsService);
    standingsService = moduleRef.get(StandingsService);
    prisma = moduleRef.get(PrismaService);
  });

  const baseDto = {
    clientEventId: '11111111-1111-1111-1111-111111111111',
    type: 'GOAL',
    minute: 10,
    teamId: HOME_TEAM_ID,
  };

  it('returns the existing event without re-creating it when the clientEventId was already recorded', async () => {
    const existing = fakeEvent();
    repository.findByClientEventId.mockResolvedValue(existing as never);

    const result = await service.recordEvent(
      FIXTURE_ID,
      baseDto as never,
      RECORDED_BY,
    );

    expect(result).toEqual(existing.toPublic());
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a teamId that isn't one of the two fixture teams", async () => {
    await expect(
      service.recordEvent(
        FIXTURE_ID,
        { ...baseDto, teamId: 'some-other-team' } as never,
        RECORDED_BY,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a player who isn't on either team in the fixture", async () => {
    playersService.findById.mockResolvedValue({
      id: 'player-1',
      teamId: 'some-other-team',
    } as never);

    await expect(
      service.recordEvent(
        FIXTURE_ID,
        { ...baseDto, playerId: 'player-1' } as never,
        RECORDED_BY,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('allows selecting a player with no registration row at all (competition predates paid registration)', async () => {
    playersService.findById.mockResolvedValue({
      id: 'player-1',
      teamId: HOME_TEAM_ID,
    } as never);
    prisma.playerRegistration.findUnique.mockResolvedValue(null);
    repository.create.mockResolvedValue(fakeEvent() as never);

    await service.recordEvent(
      FIXTURE_ID,
      { ...baseDto, playerId: 'player-1' } as never,
      RECORDED_BY,
    );

    expect(repository.create).toHaveBeenCalled();
  });

  it('rejects selecting a player whose registration for this competition is not yet paid', async () => {
    playersService.findById.mockResolvedValue({
      id: 'player-1',
      teamId: HOME_TEAM_ID,
    } as never);
    prisma.playerRegistration.findUnique.mockResolvedValue({
      status: 'PENDING_PAYMENT',
    });

    await expect(
      service.recordEvent(
        FIXTURE_ID,
        { ...baseDto, playerId: 'player-1' } as never,
        RECORDED_BY,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('allows selecting a player whose registration is CONFIRMED or LOCKED', async () => {
    playersService.findById.mockResolvedValue({
      id: 'player-1',
      teamId: HOME_TEAM_ID,
    } as never);
    prisma.playerRegistration.findUnique.mockResolvedValue({
      status: 'LOCKED',
    });
    repository.create.mockResolvedValue(fakeEvent() as never);

    await service.recordEvent(
      FIXTURE_ID,
      { ...baseDto, playerId: 'player-1' } as never,
      RECORDED_BY,
    );

    expect(repository.create).toHaveBeenCalled();
  });

  it('records a goal and transitions the fixture to LIVE on kickoff', async () => {
    repository.create.mockResolvedValue(fakeEvent() as never);
    repository.findByFixtureId.mockResolvedValue([fakeEvent()] as never);

    await service.recordEvent(
      FIXTURE_ID,
      { ...baseDto, type: 'KICKOFF' } as never,
      RECORDED_BY,
    );

    expect(fixturesService.applyMatchEngineUpdate).toHaveBeenCalledWith(
      FIXTURE_ID,
      expect.objectContaining({ status: 'LIVE' }),
      expect.anything(),
    );
  });

  it('transitions the fixture to FINISHED on full time', async () => {
    repository.create.mockResolvedValue(
      fakeEvent({ type: 'FULL_TIME' }) as never,
    );
    repository.findByFixtureId.mockResolvedValue([] as never);

    await service.recordEvent(
      FIXTURE_ID,
      { ...baseDto, type: 'FULL_TIME' } as never,
      RECORDED_BY,
    );

    expect(fixturesService.applyMatchEngineUpdate).toHaveBeenCalledWith(
      FIXTURE_ID,
      expect.objectContaining({ status: 'FINISHED' }),
      expect.anything(),
    );
  });

  describe('graphics hooks', () => {
    function fakeFixtureWithTeams(
      overrides: Partial<Record<string, unknown>> = {},
    ) {
      return {
        id: FIXTURE_ID,
        competitionId: COMPETITION_ID,
        homeTeamId: HOME_TEAM_ID,
        awayTeamId: AWAY_TEAM_ID,
        homeScore: 2,
        awayScore: 1,
        venueName: 'Onikan Stadium',
        kickoffAt: new Date('2026-08-16T16:00:00Z'),
        homeTeam: { id: HOME_TEAM_ID, name: 'Home FC', logoUrl: null },
        awayTeam: { id: AWAY_TEAM_ID, name: 'Away FC', logoUrl: null },
        competition: { id: COMPETITION_ID, name: 'Lagos Cup', season: '2026' },
        ...overrides,
      };
    }

    it('enqueues a GOAL_ALERT with the scorer, minute, and current score', async () => {
      prisma.fixture.findUnique.mockResolvedValue(fakeFixtureWithTeams());
      playersService.findById.mockResolvedValue({
        id: 'player-1',
        teamId: HOME_TEAM_ID,
        firstName: 'Chuka',
        lastName: 'Obi',
      } as never);
      repository.create.mockResolvedValue(
        fakeEvent({ playerId: 'player-1' }) as never,
      );

      await service.recordEvent(
        FIXTURE_ID,
        {
          ...baseDto,
          playerId: 'player-1',
          teamId: HOME_TEAM_ID,
          minute: 63,
        } as never,
        RECORDED_BY,
      );

      expect(graphicsService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'GOAL_ALERT',
          competitionId: COMPETITION_ID,
          data: expect.objectContaining({
            scorerName: 'Chuka Obi',
            scoringTeamName: 'Home FC',
            homeScore: 2,
            awayScore: 1,
          }),
        }),
      );
    });

    it("enqueues a MILESTONE graphic when the scorer's goal tally lands exactly on a threshold", async () => {
      prisma.fixture.findUnique.mockResolvedValue(fakeFixtureWithTeams());
      prisma.matchEvent.count.mockResolvedValue(100);
      playersService.findById.mockResolvedValue({
        id: 'player-1',
        teamId: HOME_TEAM_ID,
        firstName: 'Chuka',
        lastName: 'Obi',
      } as never);
      repository.create.mockResolvedValue(
        fakeEvent({ playerId: 'player-1' }) as never,
      );

      await service.recordEvent(
        FIXTURE_ID,
        { ...baseDto, playerId: 'player-1', teamId: HOME_TEAM_ID } as never,
        RECORDED_BY,
      );

      expect(graphicsService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'MILESTONE',
          subjectId: 'player-1',
        }),
      );
    });

    it('does not enqueue a MILESTONE graphic when the goal tally is not on a threshold', async () => {
      prisma.fixture.findUnique.mockResolvedValue(fakeFixtureWithTeams());
      prisma.matchEvent.count.mockResolvedValue(101);
      playersService.findById.mockResolvedValue({
        id: 'player-1',
        teamId: HOME_TEAM_ID,
        firstName: 'Chuka',
        lastName: 'Obi',
      } as never);
      repository.create.mockResolvedValue(
        fakeEvent({ playerId: 'player-1' }) as never,
      );

      await service.recordEvent(
        FIXTURE_ID,
        { ...baseDto, playerId: 'player-1', teamId: HOME_TEAM_ID } as never,
        RECORDED_BY,
      );

      expect(graphicsService.enqueue).not.toHaveBeenCalledWith(
        expect.objectContaining({ template: 'MILESTONE' }),
      );
    });

    it('enqueues a FULL_TIME_RESULT graphic on a FULL_TIME event', async () => {
      prisma.fixture.findUnique.mockResolvedValue(fakeFixtureWithTeams());
      prisma.fixture.count.mockResolvedValue(1); // other fixtures still pending -> no LEAGUE_TABLE/SEASON_SUMMARY
      repository.create.mockResolvedValue(
        fakeEvent({ type: 'FULL_TIME' }) as never,
      );
      repository.findByFixtureId.mockResolvedValue([] as never);

      await service.recordEvent(
        FIXTURE_ID,
        { ...baseDto, type: 'FULL_TIME' } as never,
        RECORDED_BY,
      );

      expect(graphicsService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'FULL_TIME_RESULT',
          data: expect.objectContaining({
            homeTeamName: 'Home FC',
            awayTeamName: 'Away FC',
          }),
        }),
      );
      expect(graphicsService.enqueue).not.toHaveBeenCalledWith(
        expect.objectContaining({ template: 'LEAGUE_TABLE' }),
      );
    });

    it('enqueues a LEAGUE_TABLE graphic when no fixtures remain scheduled/live that day', async () => {
      prisma.fixture.findUnique.mockResolvedValue(fakeFixtureWithTeams());
      prisma.fixture.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1); // day check=0, season check=1 (season not over)
      repository.create.mockResolvedValue(
        fakeEvent({ type: 'FULL_TIME' }) as never,
      );
      repository.findByFixtureId.mockResolvedValue([] as never);

      standingsService.getTable.mockResolvedValue([
        {
          position: 1,
          teamName: 'Home FC',
          played: 10,
          points: 25,
          goalDifference: 12,
        },
      ] as never);

      await service.recordEvent(
        FIXTURE_ID,
        { ...baseDto, type: 'FULL_TIME' } as never,
        RECORDED_BY,
      );

      expect(graphicsService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ template: 'LEAGUE_TABLE' }),
      );
      expect(graphicsService.enqueue).not.toHaveBeenCalledWith(
        expect.objectContaining({ template: 'SEASON_SUMMARY' }),
      );
    });

    it('enqueues a SEASON_SUMMARY graphic when no fixtures remain scheduled/live anywhere in the competition', async () => {
      prisma.fixture.findUnique.mockResolvedValue(fakeFixtureWithTeams());
      prisma.fixture.count.mockResolvedValue(0); // both the day check and the season check find nothing pending
      repository.create.mockResolvedValue(
        fakeEvent({ type: 'FULL_TIME' }) as never,
      );
      repository.findByFixtureId.mockResolvedValue([] as never);

      standingsService.getTable.mockResolvedValue([
        {
          position: 1,
          teamName: 'Home FC',
          played: 10,
          points: 25,
          goalDifference: 12,
        },
      ] as never);

      await service.recordEvent(
        FIXTURE_ID,
        { ...baseDto, type: 'FULL_TIME' } as never,
        RECORDED_BY,
      );

      expect(graphicsService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'SEASON_SUMMARY',
          data: expect.objectContaining({ championTeamName: 'Home FC' }),
        }),
      );
    });

    it('never fails recordEvent when the graphics trigger throws', async () => {
      prisma.fixture.findUnique.mockRejectedValue(new Error('boom'));
      repository.create.mockResolvedValue(fakeEvent() as never);

      await expect(
        service.recordEvent(FIXTURE_ID, baseDto as never, RECORDED_BY),
      ).resolves.toBeDefined();
    });
  });

  describe('hash chaining on insert', () => {
    it('seeds prevHash from sha256(fixtureId) when this is the first event on the fixture', async () => {
      repository.findLastByFixtureId.mockResolvedValue(null);
      repository.create.mockResolvedValue(fakeEvent() as never);

      await service.recordEvent(FIXTURE_ID, baseDto as never, RECORDED_BY);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ prevHash: seedHash(FIXTURE_ID) }),
        expect.anything(),
      );
    });

    it('chains prevHash from the previous event when one already exists', async () => {
      repository.findLastByFixtureId.mockResolvedValue(
        fakeEvent({ hash: 'prior-event-hash' }) as never,
      );
      repository.create.mockResolvedValue(fakeEvent() as never);

      await service.recordEvent(FIXTURE_ID, baseDto as never, RECORDED_BY);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ prevHash: 'prior-event-hash' }),
        expect.anything(),
      );
    });

    it('always includes a non-empty hash and the recording user', async () => {
      repository.create.mockResolvedValue(fakeEvent() as never);

      await service.recordEvent(FIXTURE_ID, baseDto as never, RECORDED_BY);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: expect.any(String),
          recordedById: RECORDED_BY,
        }),
        expect.anything(),
      );
      const [[createArg]] = repository.create.mock.calls;
      expect((createArg as { hash: string }).hash.length).toBeGreaterThan(0);
    });
  });

  describe('corrections', () => {
    it('rejects a CORRECTION event missing correctsEventId or correctionReason', async () => {
      await expect(
        service.recordEvent(
          FIXTURE_ID,
          { ...baseDto, type: 'CORRECTION' } as never,
          RECORDED_BY,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("rejects a CORRECTION whose correctsEventId doesn't exist on this fixture", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.recordEvent(
          FIXTURE_ID,
          {
            ...baseDto,
            type: 'CORRECTION',
            correctsEventId: 'missing-event',
            correctionReason: 'Wrong scorer',
          } as never,
          RECORDED_BY,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a CORRECTION pointing at an event from a DIFFERENT fixture', async () => {
      repository.findById.mockResolvedValue(
        fakeEvent({ fixtureId: 'other-fixture' }) as never,
      );

      await expect(
        service.recordEvent(
          FIXTURE_ID,
          {
            ...baseDto,
            type: 'CORRECTION',
            correctsEventId: 'event-1',
            correctionReason: 'Wrong scorer',
          } as never,
          RECORDED_BY,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects correctsEventId/correctionReason on a non-CORRECTION event', async () => {
      await expect(
        service.recordEvent(
          FIXTURE_ID,
          { ...baseDto, correctsEventId: 'event-1' } as never,
          RECORDED_BY,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('accepts a well-formed CORRECTION', async () => {
      repository.findById.mockResolvedValue(fakeEvent() as never);
      repository.create.mockResolvedValue(
        fakeEvent({ type: 'CORRECTION' }) as never,
      );

      await service.recordEvent(
        FIXTURE_ID,
        {
          ...baseDto,
          type: 'CORRECTION',
          correctsEventId: 'event-1',
          correctionReason: 'Wrong scorer',
        } as never,
        RECORDED_BY,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          correctsEventId: 'event-1',
          correctionReason: 'Wrong scorer',
        }),
        expect.anything(),
      );
    });
  });

  describe('verifyChain', () => {
    it('reports valid for a fixture with no events', async () => {
      repository.findByFixtureId.mockResolvedValue([]);

      const result = await service.verifyChain(FIXTURE_ID);

      expect(result.valid).toBe(true);
      expect(result.events).toBe(0);
      expect(result.verifiedAt).toEqual(expect.any(String));
    });

    it('reports invalid when a stored hash no longer matches its recomputed value', async () => {
      const tampered = fakeEvent({
        prevHash: seedHash(FIXTURE_ID),
        hash: 'not-the-real-hash',
        minute: 5,
      });
      repository.findByFixtureId.mockResolvedValue([tampered] as never);

      const result = await service.verifyChain(FIXTURE_ID);

      expect(result.valid).toBe(false);
      expect(result.brokenAtEventId).toBe('event-1');
    });
  });
});
