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
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { PlayerRegistrationsService } from '../application/player-registrations.service';
import { RegisterPlayerDto } from '../application/dto/register-player.dto';
import { CheckoutRegistrationsDto } from '../application/dto/checkout-registrations.dto';

@ApiTags('player-registrations')
@ApiBearerAuth()
@Controller('competitions/:competitionId/registrations')
export class PlayerRegistrationsController {
  constructor(
    private readonly registrationsService: PlayerRegistrationsService,
    private readonly organisationsService: OrganisationsService,
    private readonly prisma: PrismaService,
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
