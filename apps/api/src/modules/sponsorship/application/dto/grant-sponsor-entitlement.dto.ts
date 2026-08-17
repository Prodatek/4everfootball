import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SponsorFeature } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class GrantSponsorEntitlementDto {
  @ApiProperty()
  @IsUUID()
  organisationId!: string;

  @ApiPropertyOptional({
    description: 'Omit to grant across every competition the organisation runs',
  })
  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @ApiProperty({ enum: SponsorFeature })
  @IsEnum(SponsorFeature)
  feature!: SponsorFeature;

  @ApiPropertyOptional({ example: 'Closed with MTN, invoice #4521' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
