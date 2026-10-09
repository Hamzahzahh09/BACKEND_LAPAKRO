import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmDeliveryDto {
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Bukti pengiriman minimal 5 karakter' })
  @MaxLength(2000, { message: 'Bukti pengiriman maksimal 2000 karakter' })
  deliveryNotes?: string;
}
