import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';

// No amountKobo — MediaPacksService prices from ADD_ONS.MEDIA_PACK_PER_CLUB
// / MEDIA_PACK_COMPETITION server-side depending on whether competitionId
// is given.
export class PurchaseMediaPackDto {
  @ApiProperty()
  @IsUUID()
  organisationId!: string;

  @ApiPropertyOptional({
    description:
      'Omit for a whole-club pack; set to scope the pack to one competition',
  })
  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiProperty()
  @IsEmail()
  payerEmail!: string;
}
