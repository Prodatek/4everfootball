import { ApiPropertyOptional } from '@nestjs/swagger';
import { NewsStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import type { NewsSortField, SortOrder } from '../../domain/news.repository';

export class QueryNewsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by title' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @ApiPropertyOptional({ enum: NewsStatus })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;

  @ApiPropertyOptional({ enum: ['publishedAt', 'createdAt', 'title'] })
  @IsOptional()
  @IsIn(['publishedAt', 'createdAt', 'title'])
  sortBy: NewsSortField = 'publishedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';
}
