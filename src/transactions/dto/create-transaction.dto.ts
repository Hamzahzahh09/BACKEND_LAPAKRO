import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
