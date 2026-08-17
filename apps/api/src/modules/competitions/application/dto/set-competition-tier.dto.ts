import { ApiProperty } from '@nestjs/swagger';
import { CompetitionTier } from '@prisma/client';
import { IsEnum } from 'class-validator';

// A deliberate, explicit action (own DTO/endpoint, not folded into the
// general UpdateCompetitionDto) — see the comment on
// UpdateCompetitionInput.tier in the domain repository for why: the
// licence payment endpoint prices strictly off this field, looked up
// server-side, never accepted from the client as an amount.
export class SetCompetitionTierDto {
  @ApiProperty({ enum: CompetitionTier })
  @IsEnum(CompetitionTier)
  tier!: CompetitionTier;
}
