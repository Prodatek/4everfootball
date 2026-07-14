import { ApiPropertyOptional } from '@nestjs/swagger';
import { FixtureStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateFixtureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  kickoffAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  venueName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  matchday?: string;

  @ApiPropertyOptional({ enum: FixtureStatus })
  @IsOptional()
  @IsEnum(FixtureStatus)
  status?: FixtureStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  homeScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  awayScore?: number;
}
