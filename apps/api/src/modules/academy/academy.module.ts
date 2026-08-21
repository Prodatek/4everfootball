import { Module } from '@nestjs/common';
import { OrganisationsModule } from '../organisations/organisations.module';
import { PlayersModule } from '../players/players.module';
import { GraphicsModule } from '../graphics/graphics.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { MediaModule } from '../media/media.module';
import { PdfModule } from '../pdf/pdf.module';
import { AcademyAgeGroupsService } from './application/academy-age-groups.service';
import { AcademyAttendanceService } from './application/academy-attendance.service';
import { AcademySubscriptionsService } from './application/academy-subscriptions.service';
import { TermlyReportService } from './application/termly-report.service';
import { AcademyController } from './presentation/academy.controller';
import { AcademyAttendanceController } from './presentation/academy-attendance.controller';
import {
  AcademySubscriptionRequestsController,
  AcademySubscriptionsController,
} from './presentation/academy-subscriptions.controller';
import { TermlyReportController } from './presentation/termly-report.controller';

@Module({
  imports: [
    OrganisationsModule,
    PlayersModule,
    GraphicsModule,
    InvoicesModule,
    MediaModule,
    PdfModule,
  ],
  controllers: [
    AcademyController,
    AcademyAttendanceController,
    AcademySubscriptionsController,
    AcademySubscriptionRequestsController,
    TermlyReportController,
  ],
  providers: [
    AcademyAgeGroupsService,
    AcademyAttendanceService,
    AcademySubscriptionsService,
    TermlyReportService,
  ],
})
export class AcademyModule {}
