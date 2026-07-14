import { ApiPropertyOptional } from '@nestjs/swagger';
import { FixtureStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import type {
  FixtureSortField,
  SortOrder,
} from '../../domain/fixture.repository';

export class QueryFixturesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @ApiPropertyOptional({
    description: 'Matches fixtures where the team plays home or away',
  })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ enum: FixtureStatus })
  @IsOptional()
  @IsEnum(FixtureStatus)
  status?: FixtureStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: ['kickoffAt', 'createdAt'] })
  @IsOptional()
  @IsIn(['kickoffAt', 'createdAt'])
  sortBy: FixtureSortField = 'kickoffAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'asc';
}
