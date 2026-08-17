import { Module } from '@nestjs/common';
import { OrganisationsModule } from '../organisations/organisations.module';
import { MediaModule } from '../media/media.module';
import { PdfModule } from '../pdf/pdf.module';
import { SponsorDashboardService } from './application/sponsor-dashboard.service';
import { PlayerOutcomesService } from './application/player-outcomes.service';
import { SponsorEntitlementsService } from './application/sponsor-entitlements.service';
import { ImpactReportService } from './application/impact-report.service';
import { SponsorDashboardController } from './presentation/sponsor-dashboard.controller';
import { PlayerOutcomesController } from './presentation/player-outcomes.controller';
import { SponsorEntitlementsController } from './presentation/sponsor-entitlements.controller';
import { ImpactReportController } from './presentation/impact-report.controller';

@Module({
  imports: [OrganisationsModule, MediaModule, PdfModule],
  controllers: [
    SponsorDashboardController,
    PlayerOutcomesController,
    SponsorEntitlementsController,
    ImpactReportController,
  ],
  providers: [
    SponsorDashboardService,
    PlayerOutcomesService,
    SponsorEntitlementsService,
    ImpactReportService,
  ],
  exports: [SponsorEntitlementsService],
})
export class SponsorshipModule {}
