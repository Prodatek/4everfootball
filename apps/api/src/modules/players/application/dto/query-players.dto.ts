import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlayerPosition } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import type {
  PlayerSortField,
  SortOrder,
} from '../../domain/player.repository';

export class QueryPlayersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by first or last name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ enum: PlayerPosition })
  @IsOptional()
  @IsEnum(PlayerPosition)
  position?: PlayerPosition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string;

  @ApiPropertyOptional({
    enum: ['firstName', 'lastName', 'shirtNumber', 'createdAt'],
  })
  @IsOptional()
  @IsIn(['firstName', 'lastName', 'shirtNumber', 'createdAt'])
  sortBy: PlayerSortField = 'lastName';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'asc';
}
