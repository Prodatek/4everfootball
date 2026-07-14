import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RequestUploadUrlDto {
  @ApiProperty({ example: 'team-crest.png' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  filename!: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  mimeType!: string;
}
