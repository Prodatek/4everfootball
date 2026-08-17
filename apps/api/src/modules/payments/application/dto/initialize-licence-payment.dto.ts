import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';

// No amountKobo field, deliberately — the licence fee is looked up
// server-side from COMPETITION_TIERS[competition.tier] in
// PaymentsController, never accepted from the client. See
// PaymentsService.initialize()'s InitializePaymentInput comment for why
// this is enforced structurally, not just by convention.
export class InitializeLicencePaymentDto {
  @ApiProperty()
  @IsUUID()
  organisationId!: string;

  @ApiProperty()
  @IsUUID()
  competitionId!: string;

  // Was previously hardcoded to PAYSTACK in the controller — bank transfer
  // couldn't be initiated for a licence at all, only for player-registration
  // checkout (which already had this field). Optional, defaulting to
  // PAYSTACK, for §5 A3 of MONETISATION_UI_BRIEF.md's method choice.
  @ApiPropertyOptional({ enum: PaymentProvider, default: PaymentProvider.PAYSTACK })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  // Required when provider is PAYSTACK (Paystack's initialize call needs an
  // email); optional for BANK_TRANSFER/CASH.
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  payerEmail?: string;
}
