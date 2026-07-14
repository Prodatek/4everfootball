import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddEntryDto {
  @ApiProperty({ description: 'Team UUID to enter into the competition' })
  @IsUUID()
  teamId!: string;
}
