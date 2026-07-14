import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchEventsService } from './match-events.service';
import { MATCH_EVENT_REPOSITORY } from '../domain/match-event.repository';
import type { MatchEventRepository } from '../domain/match-event.repository';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import { PlayersService } from '../../players/application/players.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MatchEventsGateway } from '../infrastructure/match-events.gateway';

const FIXTURE_ID = 'fixture-1';
const HOME_TEAM_ID = 'home-team';
const AWAY_TEAM_ID = 'away-team';

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
  return {
    id: 'event-1',
    fixtureId: FIXTURE_ID,
    type: 'GOAL',
    teamId: HOME_TEAM_ID,
    toPublic: () => ({ id: 'event-1', ...overrides }),
    ...overrides,
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
            create: jest.fn(),
            delete: jest.fn(),
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
              callback({}),
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

    const result = await service.recordEvent(FIXTURE_ID, baseDto as never);

    expect(result).toEqual(existing.toPublic());
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a teamId that isn't one of the two fixture teams", async () => {
    await expect(
      service.recordEvent(FIXTURE_ID, {
        ...baseDto,
        teamId: 'some-other-team',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a player who isn't on either team in the fixture", async () => {
    playersService.findById.mockResolvedValue({
      id: 'player-1',
      teamId: 'some-other-team',
    } as never);

    await expect(
      service.recordEvent(FIXTURE_ID, {
        ...baseDto,
        playerId: 'player-1',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('records a goal and transitions the fixture to LIVE on kickoff', async () => {
    repository.create.mockResolvedValue(fakeEvent() as never);
    repository.findByFixtureId.mockResolvedValue([fakeEvent()] as never);

    await service.recordEvent(FIXTURE_ID, {
      ...baseDto,
      type: 'KICKOFF',
    } as never);

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

    await service.recordEvent(FIXTURE_ID, {
      ...baseDto,
      type: 'FULL_TIME',
    } as never);

    expect(fixturesService.applyMatchEngineUpdate).toHaveBeenCalledWith(
      FIXTURE_ID,
      expect.objectContaining({ status: 'FINISHED' }),
      expect.anything(),
    );
  });

  it('recomputes the score from the remaining events after a delete', async () => {
    repository.findById.mockResolvedValue(fakeEvent() as never);
    // After deletion, only an away-team goal remains.
    repository.findByFixtureId.mockResolvedValue([
      fakeEvent({ id: 'event-2', teamId: AWAY_TEAM_ID }),
    ] as never);

    await service.deleteEvent(FIXTURE_ID, 'event-1');

    expect(repository.delete).toHaveBeenCalledWith(
      'event-1',
      expect.anything(),
    );
    expect(fixturesService.applyMatchEngineUpdate).toHaveBeenCalledWith(
      FIXTURE_ID,
      { homeScore: 0, awayScore: 1, status: undefined },
      expect.anything(),
    );
  });

  it('throws NotFoundException when deleting an event that belongs to a different fixture', async () => {
    repository.findById.mockResolvedValue(
      fakeEvent({ fixtureId: 'different-fixture' }) as never,
    );

    await expect(
      service.deleteEvent(FIXTURE_ID, 'event-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
