import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from './entities/payment.entity';
import { LoggerService } from '../common/logger/logger.service';
import { TransactionsService } from '../transactions/transactions.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import * as MidtransClient from 'midtrans-client';

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'va' | 'ewallet' | 'qris';
  icon: string;
  isActive: boolean;
}

@Injectable()
export class PaymentService {
  private snap: MidtransClient.Snap;
  private isMidtransConfigured = false;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly transactionsService: TransactionsService,
  ) {
    this.initializeMidtrans();
  }

  private initializeMidtrans() {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY', '');
    const isProduction =
      this.configService.get<string>('MIDTRANS_IS_PRODUCTION', 'false') ===
      'true';

    if (serverKey) {
      this.snap = new MidtransClient.Snap({
        isProduction,
        serverKey,
        clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY', ''),
      });
      this.isMidtransConfigured = true;
      const masked = serverKey.length > 10
        ? `${serverKey.substring(0, 12)}****${serverKey.substring(serverKey.length - 4)}`
        : '(invalid-key)';
      this.logger.log(
        `Midtrans Snap initialized (${isProduction ? 'PRODUCTION' : 'SANDBOX'}), key=${masked}. ` +
        `Pastikan key ${isProduction ? 'production (Mid-server-...)' : 'sandbox (SB-Mid-server-...)'} sesuai dengan environment.`,
      );
    } else {
      this.logger.warn(
        'Midtrans keys not configured - payment will use dummy mode',
      );
    }
  }

  /** Status konfigurasi untuk diagnosis (key disamarkan). */
  getConfigStatus() {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY', '');
    const clientKey = this.configService.get<string>('MIDTRANS_CLIENT_KEY', '');
    const isProduction =
      this.configService.get<string>('MIDTRANS_IS_PRODUCTION', 'false') ===
      'true';
    const mask = (k: string) =>
      k && k.length > 10
        ? `${k.substring(0, 12)}****${k.substring(k.length - 4)}`
        : '(empty)';
    return {
      configured: this.isMidtransConfigured,
      isProduction,
      serverKey: mask(serverKey || ''),
      clientKey: mask(clientKey || ''),
      // Catatan: akun lama memakai format Mid-server-... tanpa prefix SB-
      // dan tetap valid untuk sandbox (terverifikasi via createTransaction).
      // Key baru dari dashboard biasanya SB-Mid-server-... (sandbox)
      // atau Mid-server-... (production).
      keyFormat: (serverKey || '').startsWith('SB-Mid-server-')
        ? 'sandbox-baru (SB-Mid-server-...)'
        : (serverKey || '').startsWith('Mid-server-')
          ? 'lama (Mid-server-...) — tetap bisa dipakai di sandbox & production'
          : 'tidak-dikenali',
    };
  }

  private readonly paymentMethods: PaymentMethod[] = [
    {
      id: 'bca_va',
      name: 'BCA Virtual Account',
      type: 'va',
      icon: 'bca',
      isActive: true,
    },
    {
      id: 'mandiri_va',
      name: 'Mandiri Virtual Account',
      type: 'va',
      icon: 'mandiri',
      isActive: true,
    },
    {
      id: 'bni_va',
      name: 'BNI Virtual Account',
      type: 'va',
      icon: 'bni',
      isActive: true,
    },
    {
      id: 'bri_va',
      name: 'BRI Virtual Account',
      type: 'va',
      icon: 'bri',
      isActive: true,
    },
    {
      id: 'gopay',
      name: 'GoPay',
      type: 'ewallet',
      icon: 'gopay',
      isActive: true,
    },
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
    customerDetails?: { name?: string; email?: string; phone?: string },
  ): Promise<Payment> {
    if (amount < 1) {
      throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
    }

    const now = new Date();
    const orderId = `LAPAKRO-${uuidv4().substring(0, 8).toUpperCase()}-${Date.now()}`;

    const grossAmount = Math.round(amount);

    // Mode dummy hanya bila Midtrans BELUM dikonfigurasi sama sekali.
    // Bila sudah dikonfigurasi tapi request gagal (mis. key salah),
    // error WAJIB dilempar agar terlihat — jangan disembunyikan jadi URL dummy.
    if (!this.isMidtransConfigured) {
      const vaNumber = `988${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const payment = this.paymentRepository.create({
        id: uuidv4(),
        transactionId: (transactionId || null) as any,
        userId,
        amount,
        method,
        status: 'pending',
        vaNumber,
        paymentUrl: `https://pay.lapakro.id/dummy/${orderId}`,
        snapToken: null,
        externalId: orderId,
        paidAt: null as any,
        description: description || `Payment for order ${transactionId || ''}`,
        createdAt: now,
        updatedAt: now,
      });
      return this.paymentRepository.save(payment);
    }

    const enabledPayments = this.resolveEnabledPayments(method);
    const appUrl = (this.configService.get<string>('APP_URL', '') || '').replace(/\/$/, '');

    // Midtrans membatasi item_details.name maksimal 50 karakter.
    // Frontend mengirim "Pembayaran Transaksi <uuid>" (~57 char) sehingga
    // selalu ditolak dengan "item_details Name is too long".
    const rawItemName =
      description || `Pembayaran Order ${transactionId || orderId}`;
    const itemName =
      rawItemName.length > 50 ? rawItemName.substring(0, 50) : rawItemName;

    const items = [
      {
        id: (transactionId || orderId).substring(0, 50),
        price: grossAmount,
        quantity: 1,
        name: itemName,
      },
    ];
    // gross_amount WAJIB sama dengan jumlah price*quantity item_details.
    // Diturunkan dari items agar mismatch tidak mungkin terjadi.
    const computedGross = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const snapParam: Record<string, any> = {
      transaction_details: {
        order_id: orderId,
        gross_amount: computedGross,
      },
      customer_details: {
        first_name: customerDetails?.name || 'Customer',
        email: customerDetails?.email || 'customer@lapakro.com',
        phone: customerDetails?.phone || '08000000000',
      },
      item_details: items,
      credit_card: { secure: true },
      // Link sandbox kedaluwarsa 24 jam
      expiry: { unit: 'hours', duration: 24 },
    };

    if (enabledPayments) {
      snapParam.enabled_payments = enabledPayments;
    }

    // Setelah bayar di halaman Midtrans, user kembali ke frontend
    if (appUrl) {
      snapParam.callbacks = {
        finish: `${appUrl}/transactions?payment=finish&order_id=${orderId}`,
        unfinish: `${appUrl}/transactions?payment=unfinish&order_id=${orderId}`,
        error: `${appUrl}/transactions?payment=error&order_id=${orderId}`,
      };
    }

    let snapToken: string;
    let paymentUrl: string;
    try {
      const snapResponse = await this.snap.createTransaction(snapParam);
      snapToken = snapResponse.token;
      paymentUrl = snapResponse.redirect_url;
      this.logger.log(`Midtrans Snap transaction created: ${orderId}`);
    } catch (error: any) {
      const midtransMessage =
        error?.ApiResponse?.error_messages?.join('; ') ||
        error?.message ||
        'Unknown Midtrans error';
      this.logger.error(
        `Midtrans createTransaction failed for ${orderId}: ${midtransMessage}`,
        error,
      );
      // Hint soal API key hanya relevan bila Midtrans menolak autentikasi
      // (HTTP 401). Error validasi seperti 400 berarti key SUDAH benar.
      const httpStatus = error?.HttpStatusCode ?? error?.httpStatusCode;
      const isAuthError = httpStatus === 401;
      throw new HttpException(
        isAuthError
          ? `Midtrans menolak API key (401). Cek MIDTRANS_SERVER_KEY & MIDTRANS_IS_PRODUCTION di backend/.env lalu restart backend. Detail: ${midtransMessage}`
          : `Gagal membuat pembayaran Midtrans: ${midtransMessage}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const payment = this.paymentRepository.create({
      id: uuidv4(),
      transactionId: (transactionId || null) as any,
      userId,
      amount,
      method,
      status: 'pending',
      vaNumber: orderId, // gunakan orderId sebagai identifier
      paymentUrl,
      snapToken,
      externalId: orderId,
      paidAt: null as any,
      description: description || `Payment for order ${transactionId || ''}`,
      createdAt: now,
      updatedAt: now,
    });

    return this.paymentRepository.save(payment);
  }

  /**
   * Petakan id metode frontend ke daftar enabled_payments Snap.
   * Return undefined = semua payment aktif (default Midtrans).
   */
  private resolveEnabledPayments(method: string): string[] | undefined {
    switch (method) {
      case 'bca_va':
        return ['bca_va'];
      case 'bni_va':
        return ['bni_va'];
      case 'bri_va':
        return ['bri_va'];
      case 'mandiri_va':
        return ['echannel'];
      case 'gopay':
        return ['gopay'];
      case 'ovo':
        return ['ovo'];
      case 'dana':
        return ['dana'];
      case 'qris':
        return ['gopay', 'other_qris', 'shopeepay'];
      case 'echannel':
        return ['echannel'];
      default:
        return undefined;
    }
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

  /**
   * Sinkronkan status payment dengan status live di Midtrans.
   * Dipakai frontend setelah user kembali dari halaman bayar Midtrans
   * (webhook tidak bisa menjangkau localhost), dan untuk tombol
   * "Cek Status Pembayaran".
   * Jika payment completed dan terikat transaksi -> transaksi ikut
   * dimajukan pending -> awaiting_seller (sudah dibayar, tinggal kirim).
   */
  async syncWithMidtrans(input: {
    paymentId?: string;
    transactionId?: string;
    orderId?: string;
    userId: string;
  }): Promise<{
    payment: Payment;
    transaction: Transaction | null;
    midtransStatus: string | null;
  }> {
    const { paymentId, transactionId, orderId, userId } = input;
    let payment: Payment | null = null;

    if (paymentId) {
      payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });
    } else if (transactionId) {
      const list = await this.paymentRepository.find({
        where: { transactionId },
        order: { createdAt: 'DESC' },
      });
      payment = list[0] ?? null;
    } else if (orderId) {
      payment = await this.paymentRepository.findOne({
        where: { externalId: orderId },
      });
    }

    if (!payment) {
      throw new HttpException(
        'Payment tidak ditemukan. Buat pembayaran dulu lewat tombol Bayar.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (payment.userId !== userId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // Mode dummy / belum konfigurasi: tidak ada yang bisa disinkronkan.
    if (!this.isMidtransConfigured || !payment.externalId) {
      const transaction = payment.transactionId
        ? await this.safeFindTransaction(payment.transactionId)
        : null;
      return { payment, transaction, midtransStatus: null };
    }

    let live: any;
    try {
      live = await this.snap.transaction.status(payment.externalId);
    } catch (error: any) {
      // 404 dari Midtrans = order belum ada / sudah dibersihkan di sandbox.
      const httpStatus = error?.HttpStatusCode ?? error?.httpStatusCode;
      const msg =
        error?.ApiResponse?.error_messages?.join('; ') ||
        error?.message ||
        'Unknown Midtrans error';
      this.logger.error(
        `Midtrans status check failed for ${payment.externalId}: ${msg}`,
        error,
      );
      throw new HttpException(
        `Gagal mengecek status ke Midtrans: ${msg}`,
        httpStatus === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_GATEWAY,
      );
    }

    const transactionStatus: string = live?.transaction_status;
    const fraudStatus: string | undefined = live?.fraud_status;
    const { payment: updated, transaction } = await this.applyMidtransStatus(
      payment,
      transactionStatus,
      fraudStatus,
    );
    return {
      payment: updated,
      transaction,
      midtransStatus: transactionStatus ?? null,
    };
  }

  /**
   * Terapkan status Midtrans ke payment + teruskan ke transaksi.
   * Dipakai bersama oleh syncWithMidtrans dan webhook notification.
   */
  private async applyMidtransStatus(
    payment: Payment,
    transactionStatus: string,
    fraudStatus?: string,
  ): Promise<{ payment: Payment; transaction: Transaction | null }> {
    if (
      transactionStatus === 'capture' ||
      transactionStatus === 'settlement'
    ) {
      if (fraudStatus === 'accept' || fraudStatus === undefined) {
        payment.status = 'completed';
        payment.paidAt = new Date();
      }
      // fraud challenge -> biarkan pending (menunggu review Midtrans)
    } else if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'deny' ||
      transactionStatus === 'expire'
    ) {
      payment.status = transactionStatus === 'expire' ? 'expired' : 'failed';
    } else if (transactionStatus === 'pending') {
      payment.status = 'pending';
    }

    payment.updatedAt = new Date();
    const saved = await this.paymentRepository.save(payment);

    let transaction: Transaction | null = null;
    if (saved.status === 'completed' && saved.transactionId) {
      try {
        transaction = await this.transactionsService.markPaid(
          saved.transactionId,
        );
        this.logger.log(
          `Transaction ${saved.transactionId} marked paid (awaiting_seller) via Midtrans sync`,
        );
      } catch (error) {
        // Transaksi terhapus / tidak ada: payment tetap completed.
        this.logger.warn(
          `Transaction not found for completed payment ${saved.id}`,
        );
      }
    } else if (saved.transactionId) {
      transaction = await this.safeFindTransaction(saved.transactionId);
    }
    return { payment: saved, transaction };
  }

  private async safeFindTransaction(
    id: string,
  ): Promise<Transaction | null> {
    try {
      return await this.transactionsService.findById(id);
    } catch {
      return null;
    }
  }

  /**
   * Handle Midtrans webhook notification.
   * Midtrans mengirim POST request ke endpoint ini dengan data status transaksi.
   */
  async handleMidtransNotification(
    payload: Record<string, any>,
  ): Promise<Payment | null> {
    try {
      // Verifikasi notifikasi dari Midtrans jika configured
      let notificationData = payload;
      if (this.isMidtransConfigured) {
        notificationData = await this.snap.transaction.notification(payload);
      }

      const orderId: string = notificationData.order_id;
      const transactionStatus: string = notificationData.transaction_status;
      const fraudStatus: string = notificationData.fraud_status;

      this.logger.log(
        `Midtrans notification: orderId=${orderId}, status=${transactionStatus}, fraud=${fraudStatus}`,
      );

      // Cari payment berdasarkan externalId (yang merupakan orderId Midtrans)
      const payment = await this.paymentRepository.findOne({
        where: { externalId: orderId },
      });
      if (!payment) {
        this.logger.warn(`Payment not found for Midtrans orderId: ${orderId}`);
        return null;
      }

      const { payment: updated } = await this.applyMidtransStatus(
        payment,
        transactionStatus,
        fraudStatus,
      );
      return updated;
    } catch (error) {
      this.logger.error('Failed to handle Midtrans notification', error);
      throw new HttpException(
        'Failed to process notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Handle callback manual (untuk backward compat & testing)
   */
  async handleCallback(payload: {
    paymentId: string;
    status: 'completed' | 'failed';
    externalId?: string;
  }): Promise<Payment> {
    const payment = await this.getPayment(payload.paymentId);

    payment.status = payload.status;
    payment.paidAt = (
      payload.status === 'completed' ? new Date() : null
    ) as any;
    payment.updatedAt = new Date();

    return this.paymentRepository.save(payment);
  }
}
