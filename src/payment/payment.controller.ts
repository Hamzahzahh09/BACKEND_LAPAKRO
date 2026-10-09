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
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get('methods')
  getMethods() {
    const methods = this.paymentService.getPaymentMethods();
    return { success: true, data: methods };
  }

  /**
   * Cek konfigurasi Midtrans yang sedang dipakai backend
   * (key disamarkan). Berguna untuk memastikan backend sudah
   * membaca key sandbox baru — kalau masih tampil key lama,
   * berarti backend belum di-restart setelah edit .env.
   */
  @Get('midtrans/status')
  @UseGuards(JwtAuthGuard)
  getMidtransStatus() {
    return {
      success: true,
      data: this.paymentService.getConfigStatus(),
    };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: { userId: string },
    @Body()
    body: CreatePaymentDto & {
      customerDetails?: { name?: string; email?: string; phone?: string };
    },
  ) {
    const payment = await this.paymentService.createPayment(
      user.userId,
      body.amount,
      body.method || 'bca_va',
      body.transactionId,
      body.description,
      body.customerDetails,
    );
    return { success: true, data: payment, message: 'Payment created' };
  }

  /**
   * Endpoint untuk menerima notifikasi webhook dari server Midtrans.
   * URL ini harus didaftarkan di dashboard Midtrans: https://dashboard.midtrans.com/
   * Setting > Payment > Notification URL: https://yourapi.com/payment/midtrans/notification
   */
  @Post('midtrans/notification')
  @HttpCode(HttpStatus.OK)
  async handleMidtransNotification(@Body() body: Record<string, any>) {
    const payment = await this.paymentService.handleMidtransNotification(body);
    return { success: true, message: 'Notification processed', data: payment };
  }

  /**
   * Endpoint callback manual (untuk backward compat & testing internal)
   */
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

  /**
   * Sinkronkan status payment dengan Midtrans (untuk localhost/dev
   * di mana webhook tidak bisa menjangkau backend).
   * Body: { paymentId?, transactionId?, orderId? } — cukup salah satu.
   */
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async sync(
    @CurrentUser() user: { userId: string },
    @Body()
    body: { paymentId?: string; transactionId?: string; orderId?: string },
  ) {
    const result = await this.paymentService.syncWithMidtrans({
      paymentId: body.paymentId,
      transactionId: body.transactionId,
      orderId: body.orderId,
      userId: user.userId,
    });
    return {
      success: true,
      data: result,
      message: `Status pembayaran: ${result.payment.status}`,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('id') id: string) {
    const payment = await this.paymentService.getPayment(id);
    return { success: true, data: payment };
  }
}
