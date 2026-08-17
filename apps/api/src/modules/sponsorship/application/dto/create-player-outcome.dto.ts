import { ApiProperty } from '@nestjs/swagger';
import { PlayerOutcomeType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlayerOutcomeDto {
  @ApiProperty()
  @IsUUID()
  playerId!: string;

  @ApiProperty({ enum: PlayerOutcomeType })
  @IsEnum(PlayerOutcomeType)
  type!: PlayerOutcomeType;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description!: string;

  // Mandatory, unlike every other field on this DTO being optional
  // elsewhere in the codebase — this is what makes a hand-entered outcome
  // auditable rather than a claimed figure (brief §5.1).
  @ApiProperty({ example: 'Confirmed by club statement, 12 Aug 2026' })
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  sourceNote!: string;

  @ApiProperty()
  @IsDateString()
  occurredAt!: string;
}
