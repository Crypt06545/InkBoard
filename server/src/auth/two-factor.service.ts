// src/auth/two-factor.service.ts
import { Injectable } from '@nestjs/common';
import { OTP } from 'otplib/class';
import * as QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

@Injectable()
export class TwoFactorService {
  // TOTP strategy দিয়ে একটা instance বানিয়ে রাখছি, পুরো service জুড়ে reuse হবে
  private readonly otp = new OTP({ strategy: 'totp' });

  // নতুন TOTP secret বানাচ্ছি, প্রতিটা user এর জন্য unique
  generateSecret(): string {
    return this.otp.generateSecret();
  }

  // Authenticator app এ স্ক্যান করার জন্য QR code বানাচ্ছি (base64 image হিসেবে)
  async generateQrCodeDataUrl(email: string, secret: string): Promise<string> {
    const appName = process.env.TWO_FA_APP_NAME || 'MyApp';

    const otpauthUrl = this.otp.generateURI({
      issuer: appName,
      label: email,
      secret,
    });

    return QRCode.toDataURL(otpauthUrl);
  }

  // two-factor.service.ts এ এইটা বদলাও
  async verifyCode(secret: string, code: string): Promise<boolean> {
    try {
      const result = await this.otp.verify({
        secret,
        token: code,
        epochTolerance: [30, 0],
      });
      return result.valid; // ⚠️ isValid থেকে valid করলাম
    } catch {
      return false;
    }
  }

  // ৮টা recovery code বানাচ্ছি, প্রতিটা random আর readable format এ (xxxx-xxxx)
  generateRecoveryCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const part1 = crypto.randomBytes(3).toString('hex');
      const part2 = crypto.randomBytes(3).toString('hex');
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }

  // Recovery codes plain রাখি না, DB তে hash করে রাখার জন্য
  async hashRecoveryCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
  }
}
