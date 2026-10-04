import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthService } from './auth.service.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { Enable2faDto } from './dto/enable-2fa.dto.js';
import { Disable2faDto } from './dto/disable-2fa.dto.js';
import { Verify2faLoginDto } from './dto/verify-2fa-login.dto.js';
import { VerifyRecoveryCodeDto } from './dto/verify-recovery-code.dto.js';
import {
  REFRESH_TOKEN_TTL_MS,
  TRUSTED_DEVICE_TTL_MS,
} from '../constants/auth.constants.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE = REFRESH_TOKEN_TTL_MS;
const TRUSTED_DEVICE_COOKIE_NAME = 'trustedDevice';
const TRUSTED_DEVICE_MAX_AGE = TRUSTED_DEVICE_TTL_MS;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = this.extractDeviceInfo(req);
    const trustedDeviceToken =
      req.cookies?.[TRUSTED_DEVICE_COOKIE_NAME] ?? null;

    const result = await this.authService.login(
      loginDto,
      deviceInfo,
      trustedDeviceToken,
    );

    if (result.twoFactorRequired) {
      return {
        message: result.message,
        data: {
          twoFactorRequired: true,
          tempToken: result.tempToken,
        },
      };
    }

    this.setRefreshCookie(res, result.refreshToken);

    if (result.trustedDeviceToken) {
      this.setTrustedDeviceCookie(res, result.trustedDeviceToken);
    }

    return {
      message: 'Logged in successfully.',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as {
      userId: string;
      email: string;
      sessionId: string;
      refreshToken: string;
    };

    if (!user?.refreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }

    const result = await this.authService.refreshTokens(
      user.sessionId,
      user.userId,
      user.email,
      user.refreshToken,
    );

    this.setRefreshCookie(res, result.refreshToken);

    return {
      message: 'Token refreshed successfully.',
      data: { accessToken: result.accessToken },
    };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout from the current device' })
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as { sessionId: string };
    const result = await this.authService.logout(user.sessionId);

    res.clearCookie(REFRESH_COOKIE_NAME);
    return result;
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout from all devices' })
  @UseGuards(JwtAccessGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { userId: string };
    const result = await this.authService.logoutAllDevices(user.userId);

    res.clearCookie(REFRESH_COOKIE_NAME);
    res.clearCookie(TRUSTED_DEVICE_COOKIE_NAME);
    return result;
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all active sessions/devices' })
  @UseGuards(JwtAccessGuard)
  @Get('sessions')
  getSessions(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.authService.getActiveSessions(user.userId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @UseGuards(JwtAccessGuard)
  @Get('me')
  getProfile(@Req() req: Request) {
    return { message: 'Profile fetched successfully.', data: req.user };
  }

  // ─── Password Reset ───

  @ApiOperation({ summary: 'Request a password reset OTP via email' })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @ApiOperation({ summary: 'Verify the password reset OTP' })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @ApiOperation({ summary: 'Reset password using the verified reset token' })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ─── Email Verification ───

  @ApiOperation({ summary: 'Verify email using the token sent via email' })
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Query('token') token?: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required.');
    }
    return this.authService.verifyEmail(token);
  }

  @ApiOperation({ summary: 'Resend the email verification link' })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  // ─── Two-Factor Authentication ───

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate a 2FA secret and QR code' })
  @UseGuards(JwtAccessGuard)
  @Post('2fa/generate')
  @HttpCode(HttpStatus.OK)
  generateTwoFactor(@Req() req: Request) {
    const user = req.user as { userId: string; email: string };
    return this.authService.generateTwoFactorSecret(user.userId, user.email);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enable 2FA after verifying the setup code' })
  @UseGuards(JwtAccessGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(@Req() req: Request, @Body() dto: Enable2faDto) {
    const user = req.user as { userId: string };
    return this.authService.enableTwoFactor(user.userId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable 2FA (requires password + code)' })
  @UseGuards(JwtAccessGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(@Req() req: Request, @Body() dto: Disable2faDto) {
    const user = req.user as { userId: string };
    return this.authService.disableTwoFactor(user.userId, dto);
  }

  @ApiOperation({ summary: 'Complete login using a 2FA TOTP code' })
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactorLogin(
    @Body() dto: Verify2faLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = this.extractDeviceInfo(req);
    const result = await this.authService.verifyTwoFactorLogin(dto, deviceInfo);

    this.setRefreshCookie(res, result.refreshToken);

    if (result.trustedDeviceToken) {
      this.setTrustedDeviceCookie(res, result.trustedDeviceToken);
    }

    return {
      message: 'Logged in successfully.',
      data: { accessToken: result.accessToken, user: result.user },
    };
  }

  @ApiOperation({ summary: 'Complete login using a 2FA recovery code' })
  @Post('2fa/verify-recovery')
  @HttpCode(HttpStatus.OK)
  async verifyRecoveryCode(
    @Body() dto: VerifyRecoveryCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = this.extractDeviceInfo(req);
    const result = await this.authService.verifyRecoveryCodeLogin(
      dto,
      deviceInfo,
    );

    this.setRefreshCookie(res, result.refreshToken);

    if (result.trustedDeviceToken) {
      this.setTrustedDeviceCookie(res, result.trustedDeviceToken);
    }

    return {
      message: 'Logged in successfully using recovery code.',
      data: { accessToken: result.accessToken, user: result.user },
    };
  }

  // ─── Helpers ───

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });
  }

  private setTrustedDeviceCookie(res: Response, token: string) {
    res.cookie(TRUSTED_DEVICE_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TRUSTED_DEVICE_MAX_AGE,
    });
  }

  private extractDeviceInfo(req: Request) {
    const userAgent = req.headers['user-agent'] || null;
    let ipAddress = (req.ip || req.socket.remoteAddress || null) as
      string | null;

    if (ipAddress === '::1') {
      ipAddress = '127.0.0.1';
    } else if (ipAddress?.startsWith('::ffff:')) {
      ipAddress = ipAddress.replace('::ffff:', '');
    }

    let deviceName = 'Unknown Device';
    if (userAgent) {
      if (/mobile/i.test(userAgent)) deviceName = 'Mobile Device';
      else if (/windows/i.test(userAgent)) deviceName = 'Windows PC';
      else if (/mac/i.test(userAgent)) deviceName = 'Mac';
      else if (/linux/i.test(userAgent)) deviceName = 'Linux';
    }

    return { deviceName, userAgent, ipAddress };
  }
}
