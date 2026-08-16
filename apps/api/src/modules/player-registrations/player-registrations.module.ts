import { Module } from '@nestjs/common';
import { OrganisationsModule } from '../organisations/organisations.module';
import { PaymentsModule } from '../payments/payments.module';
import { GraphicsModule } from '../graphics/graphics.module';
import { PlayerRegistrationsService } from './application/player-registrations.service';
import { PlayerRegistrationsController } from './presentation/player-registrations.controller';

@Module({
  imports: [OrganisationsModule, PaymentsModule, GraphicsModule],
  controllers: [PlayerRegistrationsController],
  providers: [PlayerRegistrationsService],
  exports: [PlayerRegistrationsService],
})
export class PlayerRegistrationsModule {}
