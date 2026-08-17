import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTeamDto {
  @ApiProperty()
  @IsUUID()
  teamId!: string;
}
