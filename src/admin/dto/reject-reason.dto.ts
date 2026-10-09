import { IsOptional, IsString } from 'class-validator';

export class RejectReasonDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
