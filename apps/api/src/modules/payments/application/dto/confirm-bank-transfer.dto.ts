import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmBankTransferDto {
  @ApiPropertyOptional({
    description: "The bank's own transaction/reference number",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerReference?: string;

  @ApiPropertyOptional({
    description:
      'URL of an uploaded proof-of-transfer image (via the existing media upload flow)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  transferProofUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  transferNote?: string;
}
