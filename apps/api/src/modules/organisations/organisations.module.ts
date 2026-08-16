import { Module } from '@nestjs/common';
import { OrganisationsService } from './application/organisations.service';
import { OrganisationsController } from './presentation/organisations.controller';

@Module({
  controllers: [OrganisationsController],
  providers: [OrganisationsService],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
