import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { GraphicsService } from '../application/graphics.service';
import { QueryGraphicsDto } from '../application/dto/query-graphics.dto';
import { formatAgeLabel } from '../domain/age';

@ApiTags('graphics')
@Controller()
export class GraphicsController {
  constructor(
    private readonly graphicsService: GraphicsService,
    private readonly organisationsService: OrganisationsService,
    private readonly prisma: PrismaService,
  ) {}

  // The "one screen" a club admin downloads every graphic for their team
  // from (brief §4 DoD).
  @ApiBearerAuth()
  @Get('organisations/:organisationId/graphics')
  async listForOrganisation(
    @Param('organisationId') organisationId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(organisationId, user);
    return this.graphicsService.listForOrganisation(organisationId);
  }

  @ApiBearerAuth()
  @Get('competitions/:competitionId/graphics')
  async listForCompetition(
    @Param('competitionId') competitionId: string,
    @Query() query: QueryGraphicsDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.assertCompetitionAccess(competitionId, user);
    return this.graphicsService.listForCompetition(competitionId, query);
  }

  // §5 G1: "Bulk download" — every graphic matching the same club/match/type
  // filters as the list above, streamed as a single zip so a browser never
  // has to fetch N files itself.
  @ApiBearerAuth()
  @Get('competitions/:competitionId/graphics/zip')
  async downloadZip(
    @Param('competitionId') competitionId: string,
    @Query() query: QueryGraphicsDto,
    @CurrentUser() user: JwtAccessPayload,
    @Res() res: Response,
  ) {
    await this.assertCompetitionAccess(competitionId, user);
    const { archive, count } = await this.graphicsService.buildZipArchive(
      competitionId,
      query,
    );

    if (count === 0) {
      throw new BadRequestException('No ready graphics match this filter');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="graphics.zip"',
    );
    archive.pipe(res);
  }

  private async assertCompetitionAccess(
    competitionId: string,
    user: JwtAccessPayload,
  ): Promise<void> {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { organisationId: true },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    await this.organisationsService.assertCanManage(
      competition.organisationId,
      user,
    );
  }

  // Public: a fan/parent following a "one-tap share" link needs to poll
  // this with no login (brief §4 — the passport is the ungated acquisition
  // loop, and knowing a random graphic id leaks nothing sensitive since
  // gating already happened at enqueue time for every other template).
  @Public()
  @Get('graphics/:id')
  async getById(@Param('id') id: string) {
    return this.graphicsService.getById(id);
  }

  @Public()
  @Get('graphics/:id/share/whatsapp')
  async shareToWhatsapp(@Param('id') id: string) {
    const graphic = await this.graphicsService.getById(id);

    if (!graphic.publicUrl) {
      throw new BadRequestException('This graphic is not ready to share yet');
    }

    void this.graphicsService.incrementShareCount(id).catch(() => undefined);

    return {
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(graphic.publicUrl)}`,
    };
  }

  // Ungated, on-demand (brief §4: "Player passport card — on registration
  // and on demand" / "it is the acquisition loop"). Get-or-create: returns
  // whatever the most recent attempt for this player is (READY, still
  // PENDING, or FAILED) rather than always minting a new one — a player
  // opening this twice in a row gets the same passport, not a queue of
  // duplicates.
  @Public()
  @Post('players/:playerId/passport')
  async getOrCreatePassport(@Param('playerId') playerId: string) {
    const existing = await this.graphicsService.findLatestForSubject(
      'PLAYER_PASSPORT',
      'PLAYER',
      playerId,
    );

    if (existing) {
      return existing;
    }

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: true,
        registrations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { competition: true },
        },
      },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const latestRegistration = player.registrations[0] ?? null;

    return this.graphicsService.enqueue({
      template: 'PLAYER_PASSPORT',
      subjectType: 'PLAYER',
      subjectId: player.id,
      data: {
        playerName: `${player.firstName} ${player.lastName}`,
        teamName: player.team?.name ?? null,
        position: player.position,
        shirtNumber: player.shirtNumber,
        nationality: player.nationality,
        ageLabel: formatAgeLabel(player.dateOfBirth),
        photoUrl: player.photoUrl,
        competitionName: latestRegistration?.competition.name ?? null,
      },
    });
  }
}
