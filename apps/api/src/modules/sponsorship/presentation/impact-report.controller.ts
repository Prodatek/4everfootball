import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { ImpactReportService } from '../application/impact-report.service';
import { SponsorEntitlementsService } from '../application/sponsor-entitlements.service';

@ApiTags('impact-report')
@ApiBearerAuth()
@Controller('competitions/:competitionId/impact-report')
export class ImpactReportController {
  constructor(
    private readonly impactReportService: ImpactReportService,
    private readonly sponsorEntitlementsService: SponsorEntitlementsService,
    private readonly organisationsService: OrganisationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('json')
  async getJson(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.assertAccess(competitionId, user);
    return this.impactReportService.generateDataset(competitionId);
  }

  @Get('csv')
  async getCsv(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: JwtAccessPayload,
    @Res() res: Response,
  ) {
    await this.assertAccess(competitionId, user);
    const dataset =
      await this.impactReportService.generateDataset(competitionId);
    const csv = this.impactReportService.toCsv(dataset);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="impact-report.csv"',
    );
    res.send(csv);
  }

  @Post('pdf')
  async generatePdf(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.assertAccess(competitionId, user);
    const { url } =
      await this.impactReportService.generateAndUploadPdf(competitionId);
    return { url };
  }

  private async assertAccess(
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

    const entitled = await this.sponsorEntitlementsService.hasEntitlement(
      competition.organisationId,
      competitionId,
      'IMPACT_REPORT',
    );

    if (!entitled) {
      throw new ForbiddenException(
        'This organisation does not have an Impact Report entitlement for this competition',
      );
    }
  }
}
