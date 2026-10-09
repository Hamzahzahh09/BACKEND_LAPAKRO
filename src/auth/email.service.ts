import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 2525);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: {
          user,
          pass,
        },
      });
    } else {
      this.logger.warn(
        'SMTP configuration is not complete. Emails will only be simulated in console.',
      );
    }
  }

  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    const subject = 'Verifikasi Akun LapakRo Anda';
    const text = `Kode verifikasi OTP Anda adalah: ${otp}. Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun.`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: '"LapakRo Verification" <hello@demomailtrap.co>',
          to: email,
          subject,
          text,
        });
        this.logger.log(
          `OTP Email successfully sent to ${email} via Nodemailer (Mailtrap SMTP)`,
        );
        return true;
      } catch (error) {
        this.logger.error(
          `Failed to send OTP Email to ${email} via Nodemailer`,
          error.stack,
        );
        this.simulateConsoleOtp(email, otp);
        return false;
      }
    } else {
      this.simulateConsoleOtp(email, otp);
      return true;
    }
  }

  private simulateConsoleOtp(email: string, otp: string) {
    this.logger.log(
      `[SIMULATED EMAIL] To: ${email} | Subject: Verifikasi Akun | OTP: ${otp}`,
    );
    console.log(`\n======================================`);
    console.log(`✉️ SIMULATED EMAIL SENT (FALLBACK)`);
    console.log(`To: ${email}`);
    console.log(`Subject: Verify Your LapakRo Account`);
    console.log(`Your OTP Code is: ${otp}`);
    console.log(`======================================\n`);
  }
}
