import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { PlayerRegistrationsService } from '../application/player-registrations.service';
import { RegisterPlayerDto } from '../application/dto/register-player.dto';
import { CheckoutRegistrationsDto } from '../application/dto/checkout-registrations.dto';
import { CashOverrideDto } from '../application/dto/cash-override.dto';
import {
  generateSquadShareToken,
  verifySquadShareToken,
} from '../domain/squad-share-token';

@ApiTags('player-registrations')
@ApiBearerAuth()
@Controller('competitions/:competitionId/registrations')
export class PlayerRegistrationsController {
  constructor(
    private readonly registrationsService: PlayerRegistrationsService,
    private readonly organisationsService: OrganisationsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // §5 A4/B4/B5/B6 of MONETISATION_UI_BRIEF.md — see
  // PlayerRegistrationsService.listForCompetition(). Org-scoped to the
  // competition's own organisation, same convention as everywhere else in
  // this module.
  @Get()
  async list(
    @Param('competitionId') competitionId: string,
    @Query('teamId') teamId: string | undefined,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    await this.organisationsService.assertCanManage(
      competition.organisationId,
      user,
    );

    return this.registrationsService.listForCompetition(
      competitionId,
      teamId,
    );
  }

  // §5 B5 of MONETISATION_UI_BRIEF.md — the club-side, authenticated call
  // that fetches the token to build a shareable link from. Org-scoped: only
  // the club that owns the team can generate/see its own share link.
  @Get('share-token')
  async getShareToken(
    @Param('competitionId') competitionId: string,
    @Query('teamId') teamId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.assertCanManageTeam(teamId, user);
    return {
      token: generateSquadShareToken(
        this.config.get<string>('JWT_ACCESS_SECRET')!,
        competitionId,
        teamId,
      ),
    };
  }

  // The public side of the same link — no login. Deliberately sanitized:
  // player name + registration status only, never guardian consent details
  // or the raw priceKobo breakdown (see PlayerRegistrationsService's public
  // read for exactly what's stripped).
  @Public()
  @Get('public')
  async getPublicStatus(
    @Param('competitionId') competitionId: string,
    @Query('teamId') teamId: string,
    @Query('token') token: string,
  ) {
    const valid = verifySquadShareToken(
      this.config.get<string>('JWT_ACCESS_SECRET')!,
      competitionId,
      teamId,
      token ?? '',
    );

    if (!valid) {
      throw new NotFoundException('Squad status not found');
    }

    return this.registrationsService.getPublicSquadStatus(competitionId, teamId);
  }

  @Post()
  async register(
    @Param('competitionId') competitionId: string,
    @Body() dto: RegisterPlayerDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.assertCanManageTeam(dto.teamId, user);

    return this.registrationsService.register(
      competitionId,
      dto.teamId,
      dto.playerId,
      {
        guardianName: dto.guardianName,
        guardianPhone: dto.guardianPhone,
        guardianEmail: dto.guardianEmail,
      },
    );
  }

  @Post('checkout')
  async checkout(
    @Param('competitionId') _competitionId: string,
    @Body() dto: CheckoutRegistrationsDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(dto.organisationId, user);

    return this.registrationsService.checkout(
      dto.registrationIds,
      dto.organisationId,
      dto.provider,
      dto.payerEmail,
    );
  }

  // §5 B6 — see PlayerRegistrationsService.recordCashOverride(). Org-scoped
  // to the COMPETITION's organisation (the organiser), not the paying
  // club's — this is the organiser recording cash collected at the venue
  // on a club's behalf, a different actor than checkout()'s self-service
  // club payer.
  @Post('cash-override')
  async cashOverride(
    @Param('competitionId') competitionId: string,
    @Body() dto: CashOverrideDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    await this.organisationsService.assertCanManage(
      competition.organisationId,
      user,
    );

    return this.registrationsService.recordCashOverride(
      competitionId,
      dto.registrationIds,
      dto.reason,
      user.sub,
    );
  }

  private async assertCanManageTeam(
    teamId: string,
    user: JwtAccessPayload,
  ): Promise<void> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (!team.organisationId) {
      throw new BadRequestException(
        'This team is not linked to a club account yet — an admin needs to link it before it can self-register',
      );
    }

    await this.organisationsService.assertCanManage(team.organisationId, user);
  }
}
