import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendOtpEmail(to: string, otp: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Password Reset OTP',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
            <h2>Password Reset Request</h2>
            <p>Your OTP code is:</p>
            <h1 style="letter-spacing: 4px;">${otp}</h1>
            <p>This code will expire in ${process.env.OTP_EXPIRES_MINUTES || 5} minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      // Email পাঠাতে ব্যর্থ হলেও পুরো request crash করানো ঠিক না,
      // log করে রাখছি যাতে debug করা যায়
      this.logger.error('Failed to send OTP email', error);
      throw error;
    }
  }

  async sendVerificationEmail(to: string, verificationLink: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Verify Your Email Address',
        html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
          <h2>Welcome! Verify Your Email</h2>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationLink}"
             style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Verify Email
          </a>
          <p>Or copy this link: ${verificationLink}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `,
      });
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
      throw error;
    }
  }
}
