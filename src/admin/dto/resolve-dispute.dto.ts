import { IsIn, IsOptional, IsString } from 'class-validator';

export class ResolveDisputeDto {
  @IsString()
  @IsIn(['full_refund', 'partial_refund', 'proceed'])
  resolution: 'full_refund' | 'partial_refund' | 'proceed';

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  winnerId?: string;
}
