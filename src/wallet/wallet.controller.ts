import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  async getBalance(@CurrentUser() user: { userId: string }) {
    const balance = await this.walletService.getBalance(user.userId);
    return { success: true, data: balance };
  }

  @Post('deposit')
  async deposit(
    @CurrentUser() user: { userId: string },
    @Body() dto: DepositDto,
  ) {
    const tx = await this.walletService.deposit(user.userId, dto.amount, dto.paymentMethod);
    return { success: true, data: tx, message: 'Deposit successful' };
  }

  @Post('withdraw')
  async withdraw(
    @CurrentUser() user: { userId: string },
    @Body() dto: WithdrawDto,
  ) {
    const tx = await this.walletService.withdraw(
      user.userId,
      dto.amount,
      dto.bankName,
      dto.bankAccount,
      dto.accountHolder,
    );
    return { success: true, data: tx, message: 'Withdrawal successful' };
  }

  @Get('history')
  async getHistory(@CurrentUser() user: { userId: string }) {
    const history = await this.walletService.getHistory(user.userId);
    return { success: true, data: history };
  }
}

