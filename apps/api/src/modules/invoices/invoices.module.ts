import { Module } from '@nestjs/common';
import { OrganisationsModule } from '../organisations/organisations.module';
import { InvoicesService } from './application/invoices.service';
import { InvoicesController } from './presentation/invoices.controller';

@Module({
  imports: [OrganisationsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
