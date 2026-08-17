import {
  BadRequestException,
  Controller,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@4ef/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { TermlyReportService } from '../application/termly-report.service';

@ApiTags('termly-report')
@ApiBearerAuth()
@Controller(
  'organisations/:organisationId/academy/age-groups/:ageGroupId/players/:playerId/termly-report',
)
export class TermlyReportController {
  constructor(
    private readonly termlyReportService: TermlyReportService,
    private readonly organisationsService: OrganisationsService,
  ) {}

  // Coach-accessible — a coach generating a parent-facing report is the
  // same "day to day" tier as recording attendance, not an admin action.
  @Post()
  async generate(
    @Param('organisationId') organisationId: string,
    @Param('ageGroupId') ageGroupId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: JwtAccessPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException(
        'from and to query parameters are required',
      );
    }

    await this.organisationsService.assertCanCoach(organisationId, user);

    const { dataset, url } =
      await this.termlyReportService.generateAndUploadPdf(
        playerId,
        ageGroupId,
        new Date(from),
        new Date(to),
      );

    // Brief §5.2: "shareable to a parent by WhatsApp link" — same wa.me
    // pattern as the media engine's graphic share endpoint (Phase 3).
    return {
      dataset,
      url,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(url)}`,
    };
  }
}
