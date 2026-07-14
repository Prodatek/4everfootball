import { ApiPropertyOptional } from '@nestjs/swagger';
import { CompetitionType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import type {
  CompetitionSortField,
  SortOrder,
} from '../../domain/competition.repository';

export class QueryCompetitionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by competition name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: CompetitionType })
  @IsOptional()
  @IsEnum(CompetitionType)
  type?: CompetitionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: '2025/2026' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  season?: string;

  @ApiPropertyOptional({ enum: ['name', 'season', 'startDate', 'createdAt'] })
  @IsOptional()
  @IsIn(['name', 'season', 'startDate', 'createdAt'])
  sortBy: CompetitionSortField = 'startDate';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';
}
