import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
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
}
