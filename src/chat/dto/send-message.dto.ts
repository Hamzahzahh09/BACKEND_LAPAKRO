import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  transactionId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsString()
  @IsIn(['text', 'image', 'file'])
  type?: 'text' | 'image' | 'file';
}
