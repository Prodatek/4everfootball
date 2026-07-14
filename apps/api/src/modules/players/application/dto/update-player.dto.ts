import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { CreatePlayerDto } from './create-player.dto';

export class UpdatePlayerDto extends PartialType(
  OmitType(CreatePlayerDto, ['teamId'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Team UUID to assign, or null to make the player a free agent',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  teamId?: string | null;
}
