import { ApiProperty } from '@nestjs/swagger';
import { AcademyPlanKey } from '@prisma/client';
import { IsBoolean, IsEnum } from 'class-validator';

export class SubscribePlanDto {
  @ApiProperty({ enum: AcademyPlanKey })
  @IsEnum(AcademyPlanKey)
  planKey!: AcademyPlanKey;

  @ApiProperty({ description: '20% discount when true — brief §5.2' })
  @IsBoolean()
  prepay!: boolean;
}
