import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CreateCompetitionDto } from './create-competition.dto';

export class UpdateCompetitionDto extends PartialType(CreateCompetitionDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Slug is server-generated on create (brief §3's competition page URLs
  // already depend on it existing before anyone could pick one) but §5.1's
  // sponsor-branded page wants a custom one available on request —
  // uniqueness is checked in CompetitionsService.update(), not here.
  @ApiPropertyOptional({ example: 'mtn-lagos-community-cup' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  // §5 B1 of MONETISATION_UI_BRIEF.md — the public landing page shows a
  // registration window. Deliberately NOT adding registrationFeeKobo here
  // even though the column exists: it's never read by
  // PlayerRegistrationsService.register() (which always prices off
  // PLAYER_REGISTRATION.STANDARD), so exposing it as settable would let an
  // organiser configure a price the checkout doesn't actually honour — a
  // real money-correctness risk, not just an incomplete feature. B1 shows
  // the real STANDARD price from @4ef/shared instead.
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationOpensAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationClosesAt?: string;
}
