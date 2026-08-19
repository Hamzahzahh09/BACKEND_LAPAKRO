import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get('methods')
  getMethods() {
    const methods = this.paymentService.getPaymentMethods();
    return { success: true, data: methods };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: { userId: string },
    @Body() body: { amount: number; method: string; transactionId?: string; description?: string },
  ) {
    const payment = await this.paymentService.createPayment(
      user.userId,
      body.amount,
      body.method || 'bca_va',
      body.transactionId,
      body.description,
    );
    return { success: true, data: payment, message: 'Payment created' };
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Body()
    body: {
      paymentId: string;
      status: 'completed' | 'failed';
      externalId?: string;
    },
  ) {
    const payment = await this.paymentService.handleCallback(body);
    return {
      success: true,
      data: payment,
      message: `Payment ${payment.status}`,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('id') id: string) {
    const payment = await this.paymentService.getPayment(id);
    return { success: true, data: payment };
  }
}

