import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MatchEventsService } from './match-events.service';
import { MATCH_EVENT_REPOSITORY } from '../domain/match-event.repository';
import type { MatchEventRepository } from '../domain/match-event.repository';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import { PlayersService } from '../../players/application/players.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MatchEventsGateway } from '../infrastructure/match-events.gateway';
import { seedHash } from '../domain/event-hash-chain';

const FIXTURE_ID = 'fixture-1';
const HOME_TEAM_ID = 'home-team';
const AWAY_TEAM_ID = 'away-team';
const RECORDED_BY = 'user-1';

function fakeFixture() {
  return {
    id: FIXTURE_ID,
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
      ],
    }).compile();

    service = moduleRef.get(MatchEventsService);
    repository = moduleRef.get(MATCH_EVENT_REPOSITORY);
    fixturesService = moduleRef.get(FixturesService);
    playersService = moduleRef.get(PlayersService);
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
