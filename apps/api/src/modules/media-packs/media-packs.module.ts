import { Module } from '@nestjs/common';
import { OrganisationsModule } from '../organisations/organisations.module';
import { PaymentsModule } from '../payments/payments.module';
import { MediaPacksService } from './application/media-packs.service';
import { MediaPacksController } from './presentation/media-packs.controller';

@Module({
  imports: [OrganisationsModule, PaymentsModule],
  controllers: [MediaPacksController],
  providers: [MediaPacksService],
  exports: [MediaPacksService],
})
export class MediaPacksModule {}
