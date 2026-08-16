import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompetitionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompetitionDto {
  // Optional: defaults to the legacy organisation in CompetitionsService.create()
  // so the existing admin UI (which doesn't yet have an organisation picker)
  // keeps working unchanged. Once that UI exists, callers should start
  // passing this explicitly.
  @ApiPropertyOptional({
    description: 'The organiser this competition belongs to',
  })
  @IsOptional()
  @IsUUID()
  organisationId?: string;

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

  // Media engine branding (Phase 3) — applied automatically to every
  // graphic generated for this competition. Unset falls back to the
  // platform's default palette at render time.
  @ApiPropertyOptional({ example: '#a238ff' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#0d0812' })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  sponsorLogoUrl?: string;
}
