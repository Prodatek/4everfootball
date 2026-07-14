import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchEventType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
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
}
