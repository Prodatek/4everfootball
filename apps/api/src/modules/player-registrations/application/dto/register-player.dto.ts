import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RegisterPlayerDto {
  @ApiProperty()
  @IsUUID()
  teamId!: string;

  @ApiProperty()
  @IsUUID()
  playerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  guardianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  guardianPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  guardianEmail?: string;
}
