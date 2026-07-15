import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { FixtureStatus, MatchEventType } from '@prisma/client';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import { QueryFixturesDto } from '../../fixtures/application/dto/query-fixtures.dto';
import { MatchEventsService } from './match-events.service';

const CHECK_INTERVAL_MS = 30_000;

// Auto-*starts* fixtures whose kickoff time has arrived — flips SCHEDULED to
// LIVE by recording a system-generated KICKOFF event through the same
// MatchEventsService.recordEvent() path a scout's tap goes through, so the
// event log stays the single source of truth. Deliberately does not
// auto-finish matches (FULL_TIME stays scout-controlled — stoppage time,
// forfeits, and abandonments need human judgment).
@Injectable()
export class AutoKickoffService {
  private readonly logger = new Logger(AutoKickoffService.name);

  constructor(
    private readonly fixturesService: FixturesService,
    private readonly matchEventsService: MatchEventsService,
  ) {}

  @Interval(CHECK_INTERVAL_MS)
  async checkDueFixtures(): Promise<void> {
    const query = new QueryFixturesDto();
    query.status = FixtureStatus.SCHEDULED;
    query.toDate = new Date().toISOString();
    query.page = 1;
    query.limit = 100;
    query.sortBy = 'kickoffAt';
    query.sortOrder = 'asc';

    const { data: dueFixtures } = await this.fixturesService.list(query);

    for (const fixture of dueFixtures as { id: string }[]) {
      try {
        // Deterministic clientEventId: the unique (fixtureId, clientEventId)
        // constraint is what actually guarantees at-most-once here, not the
        // interval timing — safe even if two ticks overlap.
        await this.matchEventsService.recordEvent(fixture.id, {
          clientEventId: `auto-kickoff:${fixture.id}`,
          type: MatchEventType.KICKOFF,
          minute: 0,
        });
      } catch (error) {
        this.logger.error(
          `Auto-kickoff failed for fixture ${fixture.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
