import { Test } from '@nestjs/testing';
import { AutoKickoffService } from './auto-kickoff.service';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import { MatchEventsService } from './match-events.service';

function paginated(data: unknown[]) {
  return {
    data,
    meta: { page: 1, limit: 100, total: data.length, totalPages: 1 },
  };
}

describe('AutoKickoffService', () => {
  let service: AutoKickoffService;
  let fixturesService: jest.Mocked<FixturesService>;
  let matchEventsService: jest.Mocked<MatchEventsService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AutoKickoffService,
        { provide: FixturesService, useValue: { list: jest.fn() } },
        { provide: MatchEventsService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AutoKickoffService);
    fixturesService = moduleRef.get(FixturesService);
    matchEventsService = moduleRef.get(MatchEventsService);

    fixturesService.list.mockResolvedValue(paginated([]) as never);
    matchEventsService.recordEvent.mockResolvedValue(undefined as never);
  });

  it('does nothing when no fixtures are due', async () => {
    await service.checkDueFixtures();

    expect(matchEventsService.recordEvent).not.toHaveBeenCalled();
  });

  it('queries SCHEDULED fixtures with toDate around now', async () => {
    const before = Date.now();
    await service.checkDueFixtures();
    const after = Date.now();

    const query = fixturesService.list.mock.calls[0][0];
    expect(query.status).toBe('SCHEDULED');
    expect(new Date(query.toDate!).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(query.toDate!).getTime()).toBeLessThanOrEqual(after);
  });

  it('records a KICKOFF event with a deterministic clientEventId for each due fixture', async () => {
    fixturesService.list.mockResolvedValue(
      paginated([{ id: 'fixture-1' }, { id: 'fixture-2' }]) as never,
    );

    await service.checkDueFixtures();

    expect(matchEventsService.recordEvent).toHaveBeenCalledTimes(2);
    expect(matchEventsService.recordEvent).toHaveBeenCalledWith('fixture-1', {
      clientEventId: 'auto-kickoff:fixture-1',
      type: 'KICKOFF',
      minute: 0,
    });
    expect(matchEventsService.recordEvent).toHaveBeenCalledWith('fixture-2', {
      clientEventId: 'auto-kickoff:fixture-2',
      type: 'KICKOFF',
      minute: 0,
    });
  });

  it('continues past a fixture whose recordEvent call throws', async () => {
    fixturesService.list.mockResolvedValue(
      paginated([{ id: 'bad-fixture' }, { id: 'good-fixture' }]) as never,
    );
    matchEventsService.recordEvent.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    await expect(service.checkDueFixtures()).resolves.not.toThrow();

    expect(matchEventsService.recordEvent).toHaveBeenCalledTimes(2);
    expect(matchEventsService.recordEvent).toHaveBeenCalledWith(
      'good-fixture',
      expect.objectContaining({ clientEventId: 'auto-kickoff:good-fixture' }),
    );
  });
});
