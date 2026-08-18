import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { COMPETITION_TIERS, type CompetitionTierKey } from '@4ef/shared';
import type { JwtAccessPayload } from '@4ef/shared';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrganisationsService } from '../../organisations/application/organisations.service';
import { PaymentsService } from '../application/payments.service';
import { PaystackWebhookService } from '../application/paystack-webhook.service';
import { PaystackClientService } from '../infrastructure/paystack-client.service';
import { InitializeLicencePaymentDto } from '../application/dto/initialize-licence-payment.dto';
import { ConfirmBankTransferDto } from '../application/dto/confirm-bank-transfer.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly webhookService: PaystackWebhookService,
    private readonly paystackClient: PaystackClientService,
    private readonly organisationsService: OrganisationsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // §5 A3 of MONETISATION_UI_BRIEF.md: "choosing bank transfer shows the
  // account details" — these existed only as env vars read nowhere, no
  // endpoint ever surfaced them to a client.
  @ApiBearerAuth()
  @Get('bank-details')
  getBankDetails() {
    return {
      bankName: this.config.get<string>('BUSINESS_BANK_NAME') ?? null,
      accountName: this.config.get<string>('BUSINESS_ACCOUNT_NAME') ?? null,
      accountNumber: this.config.get<string>('BUSINESS_ACCOUNT_NUMBER') ?? null,
    };
  }

  // Licence payments only — see the InitializeLicencePaymentDto comment.
  // Player-registration checkout has its own endpoint under
  // /player-registrations, since pricing a squad is domain-specific in a
  // way a generic payments endpoint shouldn't need to know about.
  @ApiBearerAuth()
  @Post('initialize')
  async initializeLicencePayment(
    @Body() dto: InitializeLicencePaymentDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    await this.organisationsService.assertCanManage(dto.organisationId, user);

    const competition = await this.prisma.competition.findUnique({
      where: { id: dto.competitionId },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    if (competition.organisationId !== dto.organisationId) {
      throw new BadRequestException(
        'This competition does not belong to that organisation',
      );
    }

    const tierConfig =
      COMPETITION_TIERS[competition.tier as CompetitionTierKey];
    const currentUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.sub },
    });

    const { payment, authorizationUrl } = await this.paymentsService.initialize(
      {
        organisationId: dto.organisationId,
        provider: dto.provider ?? 'PAYSTACK',
        purpose: 'LICENCE',
        subjectType: 'COMPETITION',
        subjectId: dto.competitionId,
        amountKobo: tierConfig.priceKobo,
        payerEmail: dto.payerEmail ?? currentUser.email,
      },
    );

    return { payment, authorizationUrl };
  }

  // Public: Paystack calls this, not a logged-in browser. Signature
  // verification (inside webhookService.handle) IS the auth for this route.
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ) {
    if (!req.rawBody) {
      // Should be unreachable — rawBody:true is set app-wide in main.ts —
      // but fail loudly rather than silently skip verification if it ever
      // isn't.
      throw new BadRequestException(
        'Raw body unavailable for signature verification',
      );
    }

    await this.webhookService.handle(req.rawBody, signature);
    // Always 200: "Respond 200 immediately, process asynchronously" — a
    // rejected/failed webhook is recorded (see webhookService.handle), not
    // surfaced as an HTTP error, so Paystack doesn't retry-storm us for
    // something retrying won't fix (e.g. an unrecognized reference).
    return { received: true };
  }

  // §5 A3/D1 of MONETISATION_UI_BRIEF.md needed somewhere to read a
  // payment's current status back — this controller had no GET routes at
  // all before this. Org-scoped the same way initialize() above is: only
  // the paying organisation (or a platform admin) can read it.
  @ApiBearerAuth()
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.organisationsService.assertCanManage(
      payment.organisationId,
      user,
    );

    return payment;
  }

  // The brief's second legitimate entitlement-granting path (never the
  // browser redirect) — for a client that wants to confirm payment status
  // right after returning from Paystack's checkout, without waiting on the
  // webhook.
  @ApiBearerAuth()
  @Post(':id/verify')
  async verify(@Param('id') id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const result = await this.paystackClient.verify(payment.reference);

    if (result.status === 'success') {
      await this.paymentsService.fulfilPayment(payment.id);
    }

    return { status: result.status };
  }

  // Was platform-admin-only; loosened for §5 B6 of
  // MONETISATION_UI_BRIEF.md's organiser console, which needs to record a
  // "paid cash at the venue" override itself rather than routing every one
  // through platform staff. A platform admin can still confirm any
  // organisation's transfer, same convention as everywhere else.
  @ApiBearerAuth()
  @Post(':id/confirm-transfer')
  async confirmTransfer(
    @Param('id') id: string,
    @Body() dto: ConfirmBankTransferDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.organisationsService.assertCanManage(
      payment.organisationId,
      user,
    );

    await this.paymentsService.confirmBankTransfer(id, user.sub, dto);
    return { confirmed: true };
  }
}
