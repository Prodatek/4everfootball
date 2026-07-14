import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
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

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SCOUT')
  @Delete(':fixtureId/events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('fixtureId') fixtureId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.matchEventsService.deleteEvent(fixtureId, eventId);
  }
}
