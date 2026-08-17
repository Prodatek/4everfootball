import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class RecordAttendanceDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  attendanceCount!: number;
}
