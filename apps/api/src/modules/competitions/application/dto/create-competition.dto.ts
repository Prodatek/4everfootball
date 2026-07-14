import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompetitionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompetitionDto {
  @ApiProperty({ example: 'Premier League' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: CompetitionType, default: CompetitionType.LEAGUE })
  @IsEnum(CompetitionType)
  type!: CompetitionType;

  @ApiProperty({ example: '2025/2026' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  season!: string;

  @ApiPropertyOptional({ example: 'England' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
