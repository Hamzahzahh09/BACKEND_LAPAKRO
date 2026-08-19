import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerService } from '../logger/logger.service';

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, any>;
  html?: string;
}

export enum EmailTemplate {
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  PAYMENT_RECEIVED = 'payment_received',
  REVIEW_REQUEST = 'review_request',
  DISPUTE_OPENED = 'dispute_opened',
  DISPUTE_RESOLVED = 'dispute_resolved',
  SELLER_APPROVED = 'seller_approved',
  SELLER_REJECTED = 'seller_rejected',
  NEW_MESSAGE = 'new_message',
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('MAILTRAP_HOST', 'live.smtp.mailtrap.io');
    const port = this.configService.get<number>('MAILTRAP_PORT', 587);
    const user = this.configService.get<string>('MAILTRAP_USER');
    const pass = this.configService.get<string>('MAILTRAP_PASS');
    this.fromEmail = this.configService.get<string>('MAILTRAP_FROM_EMAIL', 'noreply@lapakro.com');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('Email service initialized');
    } else {
      this.logger.warn('Email service not configured - using dummy transporter');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  private getTemplate(template: EmailTemplate, context: Record<string, any>): string {
    switch (template) {
      case EmailTemplate.WELCOME:
        return this.getWelcomeTemplate(context);
      case EmailTemplate.EMAIL_VERIFICATION:
        return this.getEmailVerificationTemplate(context);
      case EmailTemplate.PASSWORD_RESET:
        return this.getPasswordResetTemplate(context);
      case EmailTemplate.ORDER_CONFIRMATION:
        return this.getOrderConfirmationTemplate(context);
      case EmailTemplate.ORDER_SHIPPED:
        return this.getOrderShippedTemplate(context);
      case EmailTemplate.ORDER_DELIVERED:
        return this.getOrderDeliveredTemplate(context);
      case EmailTemplate.PAYMENT_RECEIVED:
        return this.getPaymentReceivedTemplate(context);
      case EmailTemplate.REVIEW_REQUEST:
        return this.getReviewRequestTemplate(context);
      case EmailTemplate.DISPUTE_OPENED:
        return this.getDisputeOpenedTemplate(context);
      case EmailTemplate.DISPUTE_RESOLVED:
        return this.getDisputeResolvedTemplate(context);
      case EmailTemplate.SELLER_APPROVED:
        return this.getSellerApprovedTemplate(context);
      case EmailTemplate.SELLER_REJECTED:
        return this.getSellerRejectedTemplate(context);
      case EmailTemplate.NEW_MESSAGE:
        return this.getNewMessageTemplate(context);
      default:
        return '';
    }
  }

  async send(options: EmailOptions): Promise<boolean> {
    try {
      const html = options.html || this.getTemplate(options.template as EmailTemplate, options.context || {});

      const mailOptions = {
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${options.subject} to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${options.subject}`, error);
      return false;
    }
  }

  // Template methods
  private getWelcomeTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Selamat datang di LapakRo!</h1>
        <p>Halo ${context.name},</p>
        <p>Terima kasih telah bergabung dengan LapakRo, platform marketplace Roblox terpercaya.</p>
        <p>Mulai jelajahi ribuan item berkualitas atau mulai berjualan sekarang.</p>
        <a href="${context.appUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; margin-top: 20px;">Kunjungi LapakRo</a>
      </div>
    `;
  }

  private getEmailVerificationTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Verifikasi Email</h1>
        <p>Halo ${context.name},</p>
        <p>Silakan klik tombol di bawah untuk memverifikasi email Anda:</p>
        <a href="${context.verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; margin-top: 20px;">Verifikasi Email</a>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">Atau copy link ini: ${context.verificationUrl}</p>
      </div>
    `;
  }

  private getPasswordResetTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Reset Password</h1>
        <p>Halo ${context.name},</p>
        <p>Anda meminta untuk mereset password. Silakan klik tombol di bawah:</p>
        <a href="${context.resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; margin-top: 20px;">Reset Password</a>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">Link ini berlaku selama 1 jam.</p>
      </div>
    `;
  }

  private getOrderConfirmationTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Pesanan Dikonfirmasi</h1>
        <p>Halo ${context.buyerName},</p>
        <p>Terima kasih! Pesanan Anda telah dikonfirmasi.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Nomor Pesanan:</strong> ${context.orderId}</p>
          <p><strong>Total:</strong> Rp${context.total}</p>
          <p><strong>Penjual:</strong> ${context.sellerName}</p>
        </div>
        <a href="${context.orderUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; margin-top: 20px;">Lihat Pesanan</a>
      </div>
    `;
  }

  private getOrderShippedTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Pesanan Telah Dikirim</h1>
        <p>Halo ${context.buyerName},</p>
        <p>Pesanan Anda telah dikirim oleh penjual.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Nomor Pesanan:</strong> ${context.orderId}</p>
        </div>
      </div>
    `;
  }

  private getOrderDeliveredTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Pesanan Sudah Diterima</h1>
        <p>Halo ${context.buyerName},</p>
        <p>Pesanan Anda telah berhasil diterima. Silakan berikan review untuk membantu komunitas.</p>
        <a href="${context.reviewUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; margin-top: 20px;">Berikan Review</a>
      </div>
    `;
  }

  private getPaymentReceivedTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Pembayaran Diterima</h1>
        <p>Halo ${context.name},</p>
        <p>Pembayaran Anda sebesar Rp${context.amount} telah berhasil diterima.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Status:</strong> Berhasil</p>
          <p><strong>Jumlah:</strong> Rp${context.amount}</p>
          <p><strong>Tanggal:</strong> ${context.date}</p>
        </div>
      </div>
    `;
  }

  private getReviewRequestTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Berikan Review Anda</h1>
        <p>Halo ${context.buyerName},</p>
        <p>Bagaimana pengalaman Anda membeli ${context.productName} dari ${context.sellerName}?</p>
        <a href="${context.reviewUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; margin-top: 20px;">Tulis Review</a>
      </div>
    `;
  }

  private getDisputeOpenedTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Dispute Dibuka</h1>
        <p>Halo ${context.sellerName},</p>
        <p>Pembeli telah membuka dispute untuk pesanan Anda.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Alasan:</strong> ${context.reason}</p>
          <p><strong>Deskripsi:</strong> ${context.description}</p>
        </div>
        <a href="${context.disputeUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; margin-top: 20px;">Lihat Dispute</a>
      </div>
    `;
  }

  private getDisputeResolvedTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Dispute Telah Diselesaikan</h1>
        <p>Halo ${context.name},</p>
        <p>Dispute Anda telah diselesaikan oleh admin.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Hasil:</strong> ${context.resolution}</p>
          <p><strong>Catatan Admin:</strong> ${context.adminNote}</p>
        </div>
      </div>
    `;
  }

  private getSellerApprovedTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Akun Seller Disetujui</h1>
        <p>Halo ${context.name},</p>
        <p>Selamat! Aplikasi seller Anda telah disetujui. Anda sekarang dapat menjual produk di LapakRo.</p>
        <a href="${context.dashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; margin-top: 20px;">Ke Dashboard Seller</a>
      </div>
    `;
  }

  private getSellerRejectedTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Aplikasi Seller Ditolak</h1>
        <p>Halo ${context.name},</p>
        <p>Maaf, aplikasi seller Anda belum dapat disetujui.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Alasan:</strong> ${context.reason}</p>
        </div>
        <p>Anda dapat mencoba lagi atau hubungi support untuk informasi lebih lanjut.</p>
      </div>
    `;
  }

  private getNewMessageTemplate(context: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Pesan Baru</h1>
        <p>Halo ${context.recipientName},</p>
        <p>${context.senderName} mengirimkan pesan untuk Anda:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FFD700;">
          <p>"${context.messagePreview}"</p>
        </div>
        <a href="${context.chatUrl}" style="display: inline-block; padding: 10px 20px; background-color: #FFD700; color: #000; text-decoration: none; border-radius: 5px; margin-top: 20px;">Baca Pesan</a>
      </div>
    `;
  }
}
