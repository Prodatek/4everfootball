import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
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

  @ApiProperty()
  @IsEmail()
  payerEmail!: string;
}
