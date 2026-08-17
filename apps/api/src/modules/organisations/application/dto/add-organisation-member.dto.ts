import { ApiProperty } from '@nestjs/swagger';
import { OrganisationMemberRole } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class AddOrganisationMemberDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: OrganisationMemberRole })
  @IsEnum(OrganisationMemberRole)
  role!: OrganisationMemberRole;
}
