import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchEventType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMatchEventDto {
  @ApiProperty({
    description: 'Client-generated UUID, used for offline-retry idempotency',
  })
  @IsUUID()
  clientEventId!: string;

  @ApiProperty({ enum: MatchEventType })
  @IsEnum(MatchEventType)
  type!: MatchEventType;

  @ApiProperty({ minimum: 0, maximum: 130 })
  @IsInt()
  @Min(0)
  @Max(130)
  minute!: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  stoppageMinute?: number;

  @ApiPropertyOptional({ description: 'Team this event is attributed to' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  playerId?: string;

  @ApiPropertyOptional({
    description: 'Assisting player, only meaningful for GOAL events',
  })
  @IsOptional()
  @IsUUID()
  assistPlayerId?: string;

  @ApiPropertyOptional({
    description: 'Free-form extra detail (card reason, VAR outcome, ...)',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Required (and only meaningful) when type = CORRECTION: the event this one corrects. ' +
      'The corrected event is never edited or removed — it stays visible, this just records ' +
      'that a later event retracts its effect on the derived score/status.',
  })
  @IsOptional()
  @IsUUID()
  correctsEventId?: string;

  @ApiPropertyOptional({
    description:
      'Required when type = CORRECTION: why the corrected event was wrong.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  correctionReason?: string;
}
