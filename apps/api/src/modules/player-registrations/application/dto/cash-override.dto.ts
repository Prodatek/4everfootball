import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CashOverrideDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  registrationIds!: string[];

  @ApiProperty({ description: 'Why this is being marked paid outside the normal flow' })
  @IsString()
  @MinLength(3)
  reason!: string;
}
