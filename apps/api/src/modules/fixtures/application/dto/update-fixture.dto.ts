import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ADMIN_SETTABLE_FIXTURE_STATUSES,
  type AdminSettableFixtureStatus,
} from '@4ef/shared';

// LIVE and FINISHED are match-engine transitions — they only ever happen as
// a side effect of recording a KICKOFF/FULL_TIME match event (see
// MatchEventsService.recordEvent), never as a direct admin edit. Phase 1
// (MONETISATION_BUILD_BRIEF.md) closed this off after finding admins could
// previously PATCH a fixture straight to LIVE/FINISHED with a score of their
// choosing, completely bypassing the event log — the "Verified record"
// guarantee (see the /verify endpoint) would have been meaningless while
// that was still possible.

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

  @ApiPropertyOptional({ enum: ADMIN_SETTABLE_FIXTURE_STATUSES })
  @IsOptional()
  @IsIn(ADMIN_SETTABLE_FIXTURE_STATUSES)
  status?: AdminSettableFixtureStatus;

  // No homeScore/awayScore here — was previously a raw admin-editable field
  // with zero relationship to the event log. A wrong score is now fixed by
  // recording a CORRECTION event (POST /fixtures/:id/events), not a PATCH.
}
