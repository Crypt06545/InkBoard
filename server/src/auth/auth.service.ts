// src/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import ms from 'ms';
import crypto from 'crypto';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UsersService, DeviceInfo } from '../users/users.service.js';
import { MailerService } from '../common/mailer/mailer.service.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { TwoFactorService } from './two-factor.service.js';
import { Verify2faLoginDto } from './dto/verify-2fa-login.dto.js';
import { VerifyRecoveryCodeDto } from './dto/verify-recovery-code.dto.js';
import { Enable2faDto } from './dto/enable-2fa.dto.js';
import { Disable2faDto } from './dto/disable-2fa.dto.js';

import {
  MAX_ACTIVE_DEVICES,
  REFRESH_TOKEN_TTL_MS,
  TRUSTED_DEVICE_TTL_MS,
} from '../constants/auth.constants.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// ─── Login Result Types ───

interface TwoFactorRequiredResult {
  twoFactorRequired: true;
  tempToken: string;
  message: string;
}

interface LoginSuccessResult {
  twoFactorRequired: false;
  accessToken: string;
  refreshToken: string;
  trustedDeviceToken: string | null;
  user: { id: string; name: string; email: string };
}

type LoginResult = TwoFactorRequiredResult | LoginSuccessResult;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly twoFactorService: TwoFactorService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  // ─── Register ───
  async register(registerDto: RegisterDto) {
    const hash = await bcrypt.hash(registerDto.password, 12);

    const user = await this.userService.createUser({
      ...registerDto,
      password: hash,
    });

    const verificationToken = await this.jwtService.signAsync(
      { sub: user.id, purpose: 'email-verify' },
      {
        secret: process.env.EMAIL_VERIFICATION_TOKEN_SECRET,
        expiresIn: (process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES ||
          '24h') as any,
      },
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await this.emailQueue.add(
      'send-verification',
      { email: user.email, link: verificationLink },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      message:
        'User created successfully. Please check your email to verify your account.',
      data: user,
    };
  }

  // ─── Login ───

  async login(
    loginDto: LoginDto,
    deviceInfo: DeviceInfo,
    trustedDeviceToken: string | null,
  ): Promise<LoginResult> {
    const user = await this.userService.getUserForLogin(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const requireVerification =
      process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

    if (requireVerification && !user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your inbox or request a new verification link.',
      );
    }

    const userId = user._id.toString();

    /**
     * ------------------------------------------------
     * Trusted Device Check
     * ------------------------------------------------
     */
    if (user.twoFactorEnabled && trustedDeviceToken) {
      const trustedDeviceTokenHash =
        this.hashTrustedDeviceToken(trustedDeviceToken);

      const trustedSession = await this.userService.findTrustedDeviceSession(
        userId,
        trustedDeviceTokenHash,
      );

      if (
        trustedSession &&
        trustedSession.trustedDeviceExpiresAt &&
        trustedSession.trustedDeviceExpiresAt > new Date()
      ) {
        await this.userService.clearTrustedDevice(
          trustedSession._id.toString(),
        );

        return this.completeTwoFactorLogin(
          userId,
          user.email,
          user.name,
          deviceInfo,
          true,
        );
      }
    }

    // ─── 2FA Required ───

    if (user.twoFactorEnabled) {
      const tempToken = await this.jwtService.signAsync(
        { sub: userId, purpose: '2fa-pending' },
        {
          secret: process.env.TWO_FA_PENDING_TOKEN_SECRET,
          expiresIn: (process.env.TWO_FA_PENDING_TOKEN_EXPIRES || '5m') as any,
        },
      );

      return {
        twoFactorRequired: true,
        tempToken,
        message: 'Please provide your 2FA code to complete login.',
      };
    }

    // ─── Normal Login (no 2FA) ───

    await this.userService.enforceSessionLimit(userId, MAX_ACTIVE_DEVICES);

    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const placeholderHash = 'pending';
    const session = await this.userService.createSession(
      userId,
      placeholderHash,
      deviceInfo,
      refreshExpiresAt,
    );

    const { accessToken, refreshToken } = await this.generateTokens(
      userId,
      user.email,
      session._id.toString(),
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userService.replaceSessionToken(
      session._id.toString(),
      refreshTokenHash,
      refreshExpiresAt,
    );

    await this.userService.updateLastLogin(userId);

    return {
      twoFactorRequired: false,
      accessToken,
      refreshToken,
      trustedDeviceToken: null,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
      },
    };
  }

  // ─── Email Verification ───

  async verifyEmail(token: string) {
    let payload: { sub: string; purpose: string };

    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.EMAIL_VERIFICATION_TOKEN_SECRET,
      });
    } catch {
      throw new BadRequestException(
        'Invalid or expired verification link. Please request a new one.',
      );
    }

    if (payload.purpose !== 'email-verify') {
      throw new BadRequestException('Invalid verification token.');
    }

    const user = await this.userService.getUserById(payload.sub);

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.emailVerifiedAt) {
      return { message: 'Email is already verified.' };
    }

    await this.userService.markEmailVerified(payload.sub);

    return { message: 'Email verified successfully. You can now login.' };
  }

  async resendVerificationEmail(dto: ResendVerificationDto) {
    const user = await this.userService.getUserByEmail(dto.email);

    if (!user) {
      return {
        message:
          'If this email is registered, a verification link has been sent.',
      };
    }

    if (user.emailVerifiedAt) {
      return { message: 'This email is already verified.' };
    }

    await this.sendVerificationEmail(user._id.toString(), user.email);

    return {
      message:
        'If this email is registered, a verification link has been sent.',
    };
  }

  // ─── Helper ───

  private async sendVerificationEmail(userId: string, email: string) {
    const verificationToken = await this.jwtService.signAsync(
      { sub: userId, purpose: 'email-verify' },
      {
        secret: process.env.EMAIL_VERIFICATION_TOKEN_SECRET,
        expiresIn: (process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES ||
          '24h') as any,
      },
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await this.mailerService.sendVerificationEmail(email, verificationLink);
  }

  // ─── Refresh Access Token ───

  async refreshTokens(
    sessionId: string,
    userId: string,
    email: string,
    providedRefreshToken: string,
  ) {
    const session = await this.userService.findSessionById(sessionId);

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    const isTokenValid = await bcrypt.compare(
      providedRefreshToken,
      session.tokenHash,
    );

    if (!isTokenValid) {
      await this.userService.revokeSession(sessionId);
      throw new UnauthorizedException('Invalid session. Please login again.');
    }

    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const { accessToken, refreshToken } = await this.generateTokens(
      userId,
      email,
      sessionId,
    );

    const newHash = await bcrypt.hash(refreshToken, 10);
    await this.userService.replaceSessionToken(
      sessionId,
      newHash,
      refreshExpiresAt,
    );

    return { accessToken, refreshToken };
  }

  // ─── Logout ───

  async logout(sessionId: string) {
    await this.userService.revokeSession(sessionId);
    return { message: 'Logged out successfully.' };
  }

  async logoutAllDevices(userId: string) {
    await this.userService.revokeAllSessions(userId);
    return { message: 'Logged out from all devices successfully.' };
  }

  async getActiveSessions(userId: string) {
    const sessions = await this.userService.getActiveSessions(userId);
    return {
      message: 'Active sessions fetched successfully.',
      data: sessions,
    };
  }

  // ─── Helpers ───

  private async generateTokens(
    userId: string,
    email: string,
    sessionId: string,
  ) {
    const accessPayload = { sub: userId, email };
    const refreshPayload = { sub: userId, email, sessionId };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as any,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES || '7d') as any,
    });

    return { accessToken, refreshToken };
  }

  private calculateExpiryDate(duration: string): Date {
    const durationMs = ms(duration as any) as unknown as number;
    return new Date(Date.now() + durationMs);
  }

  private hashTrustedDeviceToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // ─── Forgot Password ───

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.getUserByEmail(dto.email);

    if (!user) {
      return {
        message: 'If this email is registered, an OTP has been sent.',
      };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresMinutes = Number(process.env.OTP_EXPIRES_MINUTES ?? 5);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await this.userService.setPasswordResetOtp(dto.email, otpHash, expiresAt);

    await this.emailQueue.add(
      'send-otp',
      { email: dto.email, otp },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      message: 'If this email is registered, an OTP has been sent.',
    };
  }

  // ─── Verify OTP ───

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userService.getUserForPasswordReset(dto.email);

    if (
      !user ||
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpiresAt
    ) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    if (user.passwordResetAttempts >= 5) {
      await this.userService.clearPasswordResetOtp(dto.email);
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    if (user.passwordResetOtpExpiresAt < new Date()) {
      await this.userService.clearPasswordResetOtp(dto.email);
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    const isOtpValid = await bcrypt.compare(dto.otp, user.passwordResetOtpHash);

    if (!isOtpValid) {
      await this.userService.incrementResetAttempts(dto.email);
      throw new BadRequestException('Invalid OTP.');
    }

    await this.userService.clearPasswordResetOtp(dto.email);

    const resetToken = await this.jwtService.signAsync(
      { sub: user._id.toString(), purpose: 'password-reset' },
      {
        secret: process.env.PASSWORD_RESET_TOKEN_SECRET,
        expiresIn: (process.env.PASSWORD_RESET_TOKEN_EXPIRES || '10m') as any,
      },
    );

    return {
      message: 'OTP verified successfully.',
      data: { resetToken },
    };
  }

  // ─── Reset Password ───

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: string; purpose: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.resetToken, {
        secret: process.env.PASSWORD_RESET_TOKEN_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }

    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Invalid reset token.');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userService.updatePassword(payload.sub, newPasswordHash);

    await this.userService.revokeAllSessions(payload.sub);

    return {
      message:
        'Password reset successfully. Please login with your new password.',
    };
  }

  // ─── Two-Factor Authentication ───

  async generateTwoFactorSecret(userId: string, email: string) {
    const secret = this.twoFactorService.generateSecret();

    await this.userService.setTwoFactorSecret(userId, secret);

    const qrCodeDataUrl = await this.twoFactorService.generateQrCodeDataUrl(
      email,
      secret,
    );

    return {
      message:
        'Scan this QR code with your authenticator app, then verify with a code to enable 2FA.',
      data: { qrCode: qrCodeDataUrl, secret },
    };
  }

  async enableTwoFactor(userId: string, dto: Enable2faDto) {
    const user = await this.userService.getUserForTwoFactorSetup(userId);

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException(
        'Please generate a 2FA secret first before enabling.',
      );
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled.');
    }

    const isValid = await this.twoFactorService.verifyCode(
      user.twoFactorSecret,
      dto.code,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code. Please try again.');
    }

    const recoveryCodes = this.twoFactorService.generateRecoveryCodes();
    const hashedCodes =
      await this.twoFactorService.hashRecoveryCodes(recoveryCodes);

    await this.userService.enableTwoFactor(userId, hashedCodes);

    return {
      message:
        '2FA enabled successfully. Save these recovery codes somewhere safe — they will not be shown again.',
      data: { recoveryCodes },
    };
  }

  async disableTwoFactor(userId: string, dto: Disable2faDto) {
    const userBasic = await this.userService.getUserById(userId);

    if (!userBasic) {
      throw new UnauthorizedException('User not found.');
    }

    const user = await this.userService.getUserForLogin(userBasic.email);

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password.');
    }

    const userWithSecret =
      await this.userService.getUserForTwoFactorSetup(userId);

    if (!userWithSecret?.twoFactorEnabled || !userWithSecret.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled.');
    }

    const isCodeValid = await this.twoFactorService.verifyCode(
      userWithSecret.twoFactorSecret,
      dto.code,
    );
    if (!isCodeValid) {
      throw new BadRequestException('Invalid 2FA code.');
    }

    await this.userService.disableTwoFactor(userId);

    return { message: '2FA disabled successfully.' };
  }

  // Login step 2 — tempToken + TOTP code
  async verifyTwoFactorLogin(
    dto: Verify2faLoginDto,
    deviceInfo: DeviceInfo,
  ): Promise<LoginSuccessResult> {
    const payload = await this.verifyPendingToken(dto.tempToken);

    const user = await this.userService.getUserForTwoFactorSetup(payload.sub);

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA is not properly configured.');
    }

    const isValid = await this.twoFactorService.verifyCode(
      user.twoFactorSecret,
      dto.code,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code.');
    }

    return this.completeTwoFactorLogin(
      user._id.toString(),
      user.email,
      user.name,
      deviceInfo,
      dto.trustDevice,
    );
  }

  // Recovery code দিয়ে login
  async verifyRecoveryCodeLogin(
    dto: VerifyRecoveryCodeDto,
    deviceInfo: DeviceInfo,
  ): Promise<LoginSuccessResult> {
    const payload = await this.verifyPendingToken(dto.tempToken);

    const user = await this.userService.getUserForRecoveryVerification(
      payload.sub,
    );

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException('2FA is not enabled for this account.');
    }

    let matchedIndex = -1;
    for (let i = 0; i < user.twoFactorRecoveryCodeHashes.length; i++) {
      const isMatch = await bcrypt.compare(
        dto.recoveryCode,
        user.twoFactorRecoveryCodeHashes[i],
      );
      if (isMatch) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      throw new UnauthorizedException('Invalid or already used recovery code.');
    }

    const remainingHashes = user.twoFactorRecoveryCodeHashes.filter(
      (_, index) => index !== matchedIndex,
    );
    await this.userService.consumeRecoveryCode(
      user._id.toString(),
      remainingHashes,
    );

    return this.completeTwoFactorLogin(
      user._id.toString(),
      user.email,
      user.name,
      deviceInfo,
      dto.trustDevice,
    );
  }

  // ─── 2FA Helpers (private) ───

  private async verifyPendingToken(
    tempToken: string,
  ): Promise<{ sub: string; purpose: string }> {
    let payload: { sub: string; purpose: string };

    try {
      payload = await this.jwtService.verifyAsync(tempToken, {
        secret: process.env.TWO_FA_PENDING_TOKEN_SECRET,
      });
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired session. Please login again.',
      );
    }

    if (payload.purpose !== '2fa-pending') {
      throw new UnauthorizedException('Invalid token.');
    }

    return payload;
  }

  private async completeTwoFactorLogin(
    userId: string,
    email: string,
    name: string,
    deviceInfo: DeviceInfo,
    trustDevice: boolean,
  ): Promise<LoginSuccessResult> {
    await this.userService.enforceSessionLimit(userId, MAX_ACTIVE_DEVICES);

    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    let trustedDeviceToken: string | null = null;
    let trustedDeviceTokenHash: string | null = null;
    let trustedDeviceExpiresAt: Date | null = null;
    const twoFactorVerifiedAt: Date = new Date();

    if (trustDevice) {
      trustedDeviceToken = crypto.randomBytes(32).toString('hex');
      trustedDeviceTokenHash = this.hashTrustedDeviceToken(trustedDeviceToken);
      trustedDeviceExpiresAt = new Date(Date.now() + TRUSTED_DEVICE_TTL_MS);
    }

    const placeholderHash = 'pending';
    const session = await this.userService.createSession(
      userId,
      placeholderHash,
      deviceInfo,
      refreshExpiresAt,
      trustedDeviceTokenHash,
      trustedDeviceExpiresAt,
      twoFactorVerifiedAt,
    );

    const { accessToken, refreshToken } = await this.generateTokens(
      userId,
      email,
      session._id.toString(),
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userService.replaceSessionToken(
      session._id.toString(),
      refreshTokenHash,
      refreshExpiresAt,
    );

    await this.userService.updateLastLogin(userId);

    return {
      twoFactorRequired: false,
      accessToken,
      refreshToken,
      trustedDeviceToken,
      user: { id: userId, name, email },
    };
  }
}
