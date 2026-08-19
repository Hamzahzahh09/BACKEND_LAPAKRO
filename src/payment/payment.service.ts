import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from './entities/payment.entity';

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'va' | 'ewallet' | 'qris';
  icon: string;
  isActive: boolean;
}

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  private readonly paymentMethods: PaymentMethod[] = [
    { id: 'bca_va', name: 'BCA Virtual Account', type: 'va', icon: 'bca', isActive: true },
    { id: 'mandiri_va', name: 'Mandiri Virtual Account', type: 'va', icon: 'mandiri', isActive: true },
    { id: 'bni_va', name: 'BNI Virtual Account', type: 'va', icon: 'bni', isActive: true },
    { id: 'bri_va', name: 'BRI Virtual Account', type: 'va', icon: 'bri', isActive: true },
    { id: 'gopay', name: 'GoPay', type: 'ewallet', icon: 'gopay', isActive: true },
    { id: 'ovo', name: 'OVO', type: 'ewallet', icon: 'ovo', isActive: true },
    { id: 'dana', name: 'DANA', type: 'ewallet', icon: 'dana', isActive: true },
    { id: 'qris', name: 'QRIS', type: 'qris', icon: 'qris', isActive: true },
  ];

  async createPayment(
    userId: string,
    amount: number,
    method: string,
    transactionId?: string,
    description?: string,
  ): Promise<Payment> {
    if (amount < 1) {
      throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
    }

    const now = new Date();
    const vaNumber = `988${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const payment = this.paymentRepository.create({
      id: uuidv4(),
      transactionId: (transactionId || null) as any,
      userId,
      amount,
      method,
      status: 'pending',
      vaNumber,
      paymentUrl: `https://pay.lapakro.id/pay/${uuidv4().substring(0, 12)}`,
      paidAt: null as any,
      description: description || `Payment for order ${transactionId || ''}`,
      createdAt: now,
      updatedAt: now,
    });

    return this.paymentRepository.save(payment);
  }

  getPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter((m) => m.isActive);
  }

  async getPayment(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }
    return payment;
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async handleCallback(payload: {
    paymentId: string;
    status: 'completed' | 'failed';
    externalId?: string;
  }): Promise<Payment> {
    const payment = await this.getPayment(payload.paymentId);

    payment.status = payload.status;
    payment.paidAt = (payload.status === 'completed' ? new Date() : null) as any;
    payment.updatedAt = new Date();

    return this.paymentRepository.save(payment);
  }
}

