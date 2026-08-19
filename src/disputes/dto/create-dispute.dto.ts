import { IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  transactionId: string;

  @IsString()
  @MinLength(5)
  @MaxLength(100)
  reason: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}
