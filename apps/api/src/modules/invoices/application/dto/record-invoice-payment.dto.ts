import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class RecordInvoicePaymentDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  amountKobo!: number;
}
