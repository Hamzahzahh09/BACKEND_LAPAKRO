import { IsString, IsNumber, Min } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @Min(20000)
  amount: number;

  @IsString()
  bankAccount: string;

  @IsString()
  bankName: string;

  @IsString()
  accountHolder: string;
}
