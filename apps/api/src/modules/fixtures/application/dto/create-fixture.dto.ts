import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateFixtureDto {
  @ApiProperty()
  @IsUUID()
  competitionId!: string;

  @ApiProperty()
  @IsUUID()
  homeTeamId!: string;

  @ApiProperty()
  @IsUUID()
  awayTeamId!: string;

  @ApiProperty()
  @IsDateString()
  kickoffAt!: string;

  @ApiPropertyOptional({ example: 'Old Trafford' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  venueName?: string;

  @ApiPropertyOptional({ example: 'Matchday 3' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  matchday?: string;
}
