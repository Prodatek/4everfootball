import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

// No amountKobo — see PlayerRegistrationsService.checkout(), which sums
// each selected registration's server-stored priceKobo snapshot. Only ids
// are ever accepted from the client.
export class CheckoutRegistrationsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  registrationIds!: string[];

  @ApiProperty()
  @IsUUID()
  organisationId!: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  // Was required — only Paystack's own initialize call actually needs an
  // email (BANK_TRANSFER/CASH skip it entirely, same as licence payments);
  // the controller falls back to the current user's account email when
  // this is omitted.
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  payerEmail?: string;
}
