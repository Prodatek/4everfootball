import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { SponsorDashboardService } from '../application/sponsor-dashboard.service';

// Public and ungated — brief §5.1: "Sponsor-branded PUBLIC competition
// page ... Live sponsor dashboard" are listed together, meant to sit on
// the same page. Nothing here costs anything to compute or leaks anything
// sensitive; it's marketing collateral, not a paid deliverable (that's
// ImpactReportController, which is gated).
@ApiTags('sponsor-dashboard')
@Controller('competitions')
export class SponsorDashboardController {
  constructor(private readonly dashboardService: SponsorDashboardService) {}

  @Public()
  @Get(':slug/sponsor-dashboard')
  getDashboard(@Param('slug') slug: string) {
    return this.dashboardService.getForSlug(slug);
  }
}
