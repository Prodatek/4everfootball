import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MatchEventsService } from '../application/match-events.service';
import { CreateMatchEventDto } from '../application/dto/create-match-event.dto';

@ApiTags('match-events')
@Controller('fixtures')
export class MatchEventsController {
  constructor(private readonly matchEventsService: MatchEventsService) {}

  @Public()
  @Get(':fixtureId/events')
  list(@Param('fixtureId') fixtureId: string) {
    return this.matchEventsService.listForFixture(fixtureId);
  }

  @Public()
  @Get(':fixtureId/live-state')
  getLiveState(@Param('fixtureId') fixtureId: string) {
    return this.matchEventsService.getLiveState(fixtureId);
  }

  // Public and user-facing on purpose (brief §2.1): a "Verified record"
  // badge a skeptical organiser can click, not an internal debug route.
  @Public()
  @Get(':fixtureId/verify')
  verify(@Param('fixtureId') fixtureId: string) {
    return this.matchEventsService.verifyChain(fixtureId);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SCOUT')
  @Post(':fixtureId/events')
  record(
    @Param('fixtureId') fixtureId: string,
    @Body() dto: CreateMatchEventDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.matchEventsService.recordEvent(fixtureId, dto, user.sub);
  }

  // No DELETE route. match_events is append-only — a mistake is fixed by
  // recording a CORRECTION event (POST, type: CORRECTION, correctsEventId +
  // correctionReason required), never by removing the original. See
  // MONETISATION_BUILD_BRIEF.md Phase 1 and the Phase 0 report's finding
  // that the old DELETE endpoint was reachable by SCOUT — the least-trusted
  // writer role — with no audit trail.
}
