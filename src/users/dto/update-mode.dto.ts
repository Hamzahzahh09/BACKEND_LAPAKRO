import { IsString, IsIn } from 'class-validator';

export class UpdateModeDto {
  @IsString()
  @IsIn(['buyer', 'seller', 'both'])
  mode: 'buyer' | 'seller' | 'both';
}
