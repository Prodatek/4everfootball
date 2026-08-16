import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

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
}
