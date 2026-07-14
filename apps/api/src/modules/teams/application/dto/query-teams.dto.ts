import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import type { SortOrder, TeamSortField } from '../../domain/team.repository';

export class QueryTeamsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by team name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ enum: ['name', 'foundedYear', 'createdAt'] })
  @IsOptional()
  @IsIn(['name', 'foundedYear', 'createdAt'])
  sortBy: TeamSortField = 'name';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'asc';
}
