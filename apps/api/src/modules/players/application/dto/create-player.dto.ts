import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlayerPosition, PreferredFoot } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlayerDto {
  @ApiProperty({ example: 'Kylian' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName!: string;

  @ApiProperty({ example: 'Mbappe' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName!: string;

  @ApiPropertyOptional({ example: '1998-12-20' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'France' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string;

  @ApiPropertyOptional({ enum: PlayerPosition })
  @IsOptional()
  @IsEnum(PlayerPosition)
  position?: PlayerPosition;

  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 99 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  shirtNumber?: number;

  @ApiPropertyOptional({ example: 178, minimum: 100, maximum: 250 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm?: number;

  @ApiPropertyOptional({ enum: PreferredFoot })
  @IsOptional()
  @IsEnum(PreferredFoot)
  preferredFoot?: PreferredFoot;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Team UUID, omit for a free agent' })
  @IsOptional()
  @IsUUID()
  teamId?: string;
}
