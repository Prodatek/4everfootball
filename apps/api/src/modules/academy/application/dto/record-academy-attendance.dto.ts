import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class RecordAcademyAttendanceDto {
  @ApiProperty()
  @IsUUID()
  ageGroupId!: string;

  @ApiProperty()
  @IsUUID()
  playerId!: string;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  // Generated once on the device (brief §5.2: "works offline, same sync
  // mechanism as match capture") — the idempotency key a connectivity
  // retry resolves against. See AcademyAttendanceService.record().
  @ApiProperty()
  @IsString()
  @MinLength(1)
  clientEventId!: string;
}
