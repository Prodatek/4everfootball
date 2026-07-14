import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Real Madrid CF' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'RMA' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  shortName?: string;

  @ApiPropertyOptional({ example: 'Spain' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: 1902 })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  foundedYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'Santiago Bernabeu' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  venueName?: string;
}
