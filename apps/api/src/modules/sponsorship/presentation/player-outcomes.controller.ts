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
import { PlayerOutcomesService } from '../application/player-outcomes.service';
import { CreatePlayerOutcomeDto } from '../application/dto/create-player-outcome.dto';

@ApiTags('player-outcomes')
@Controller()
export class PlayerOutcomesController {
  constructor(private readonly outcomesService: PlayerOutcomesService) {}

  // Public listing, same convention as news articles — a player's
  // verified trials/call-ups/signings are credibility content, not
  // sensitive data.
  @Public()
  @Get('players/:playerId/outcomes')
  listForPlayer(@Param('playerId') playerId: string) {
    return this.outcomesService.listForPlayer(playerId);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
  @Post('players/:playerId/outcomes')
  create(
    @Param('playerId') playerId: string,
    @Body() dto: CreatePlayerOutcomeDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.outcomesService.create({
      playerId,
      type: dto.type,
      description: dto.description,
      sourceNote: dto.sourceNote,
      occurredAt: new Date(dto.occurredAt),
      createdById: user.sub,
    });
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')
  @Delete('player-outcomes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.outcomesService.remove(id);
  }
}
