import { Module } from '@nestjs/common';
import { OrganisationsModule } from '../organisations/organisations.module';
import { MediaModule } from '../media/media.module';
import { PdfModule } from '../pdf/pdf.module';
import { InvoicesService } from './application/invoices.service';
import { InvoicesController } from './presentation/invoices.controller';

@Module({
  imports: [OrganisationsModule, MediaModule, PdfModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
