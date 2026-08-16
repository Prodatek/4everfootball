import { Module } from '@nestjs/common';
import { OrganisationsModule } from '../organisations/organisations.module';
import { PaymentsService } from './application/payments.service';
import { PaystackWebhookService } from './application/paystack-webhook.service';
import { PaymentReconciliationService } from './application/payment-reconciliation.service';
import { PaystackClientService } from './infrastructure/paystack-client.service';
import { PaymentsController } from './presentation/payments.controller';

@Module({
  imports: [OrganisationsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaystackWebhookService,
    PaymentReconciliationService,
    PaystackClientService,
  ],
  exports: [PaymentsService, PaystackClientService],
})
export class PaymentsModule {}
