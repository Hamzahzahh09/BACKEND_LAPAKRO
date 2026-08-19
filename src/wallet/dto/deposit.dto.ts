import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DepositDto {
  @IsNumber()
  @Min(5000)
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
