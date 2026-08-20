import { ApiPropertyOptional } from '@nestjs/swagger';
import { GraphicTemplate } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

// §5 G1: "filterable by club, match and type." type -> template (the
// enum already IS the type), club -> teamId, match -> fixtureId.
export class QueryGraphicsDto {
  @ApiPropertyOptional({ enum: GraphicTemplate })
  @IsOptional()
  @IsEnum(GraphicTemplate)
  template?: GraphicTemplate;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fixtureId?: string;
}
