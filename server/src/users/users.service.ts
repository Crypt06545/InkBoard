import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RegisterDto } from '../auth/dto/register.dto.js';
import { User, UserDocument } from './schemas/user.schema.js';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema.js';

export interface DeviceInfo {
  deviceName: string;
  userAgent: string | null;
  ipAddress: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
  ) {}

  // ─── User ───

  async createUser(registerDto: RegisterDto) {
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });

    if (existingUser) {
      throw new ConflictException('This email is already registered.');
    }

    const newUser = await this.userModel.create(registerDto);

    return {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
    };
  }

  async getUserForLogin(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password');
  }

  async getUserByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async updateLastLogin(userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { lastLoginAt: new Date() } },
    );
  }

  // ─── Refresh Token / Session Management ───

  async createSession(
    userId: string,
    tokenHash: string,
    deviceInfo: DeviceInfo,
    expiresAt: Date,
    trustedDeviceTokenHash: string | null = null,
    trustedDeviceExpiresAt: Date | null = null,
    twoFactorVerifiedAt: Date | null = null,
  ) {
    return this.refreshTokenModel.create({
      user: new Types.ObjectId(userId),
      tokenHash,
      deviceName: deviceInfo.deviceName,
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ipAddress,
      expiresAt,
      trustedDeviceTokenHash,
      trustedDeviceExpiresAt,
      twoFactorVerifiedAt,
    });
  }

  async enforceSessionLimit(userId: string, maxSessions: number) {
    const activeSessions = await this.refreshTokenModel
      .find({
        user: new Types.ObjectId(userId),
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: 1 });

    if (activeSessions.length >= maxSessions) {
      const excessCount = activeSessions.length - maxSessions + 1;
      const sessionsToRemove = activeSessions.slice(0, excessCount);

      await this.refreshTokenModel.deleteMany({
        _id: { $in: sessionsToRemove.map((s) => s._id) },
      });
    }
  }

  async findSessionById(
    sessionId: string,
  ): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel
      .findById(sessionId)
      .select('+tokenHash +trustedDeviceTokenHash');
  }

  async revokeSession(sessionId: string) {
    await this.refreshTokenModel.updateOne(
      { _id: sessionId },
      {
        $set: {
          isRevoked: true,
        },
      },
    );

    return {
      message: 'Logged out successfully.',
    };
  }

  async getActiveSessions(userId: string) {
    return this.refreshTokenModel
      .find({
        user: new Types.ObjectId(userId),
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
      .select('-tokenHash')
      .sort({ createdAt: -1 });
  }

  async revokeAllSessions(userId: string) {
    await this.refreshTokenModel.updateMany(
      {
        user: new Types.ObjectId(userId),
      },
      {
        $set: {
          isRevoked: true,
          trustedDeviceTokenHash: null,
          trustedDeviceExpiresAt: null,
        },
      },
    );
  }

  async replaceSessionToken(
    sessionId: string,
    newTokenHash: string,
    newExpiresAt: Date,
  ) {
    await this.refreshTokenModel.updateOne(
      { _id: sessionId },
      { $set: { tokenHash: newTokenHash, expiresAt: newExpiresAt } },
    );
  }

  async setPasswordResetOtp(email: string, otpHash: string, expiresAt: Date) {
    await this.userModel.updateOne(
      { email },
      {
        $set: {
          passwordResetOtpHash: otpHash,
          passwordResetOtpExpiresAt: expiresAt,
          passwordResetAttempts: 0,
        },
      },
    );
  }

  async getUserForPasswordReset(email: string) {
    return this.userModel
      .findOne({ email })
      .select(
        '+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetAttempts',
      );
  }

  async incrementResetAttempts(email: string) {
    await this.userModel.updateOne(
      { email },
      { $inc: { passwordResetAttempts: 1 } },
    );
  }

  async clearPasswordResetOtp(email: string) {
    await this.userModel.updateOne(
      { email },
      {
        $set: {
          passwordResetOtpHash: null,
          passwordResetOtpExpiresAt: null,
          passwordResetAttempts: 0,
        },
      },
    );
  }

  async updatePassword(userId: string, newPasswordHash: string) {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          password: newPasswordHash,
          passwordChangedAt: new Date(),
        },
      },
    );
  }

  async markEmailVerified(userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { emailVerifiedAt: new Date() } },
    );
  }

  async getUserById(userId: string) {
    return this.userModel.findById(userId);
  }

  async getUserForTwoFactorSetup(userId: string) {
    return this.userModel
      .findById(userId)
      .select('+twoFactorSecret +twoFactorRecoveryCodeHashes');
  }

  async setTwoFactorSecret(userId: string, secret: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { twoFactorSecret: secret } },
    );
  }

  async enableTwoFactor(userId: string, recoveryCodeHashes: string[]) {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          twoFactorEnabled: true,
          twoFactorRecoveryCodeHashes: recoveryCodeHashes,
        },
      },
    );
  }

  async disableTwoFactor(userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorRecoveryCodeHashes: [],
        },
      },
    );

    await this.refreshTokenModel.updateMany(
      { user: new Types.ObjectId(userId) },
      {
        $set: {
          trustedDeviceTokenHash: null,
          trustedDeviceExpiresAt: null,
        },
      },
    );
  }

  async getUserForRecoveryVerification(userId: string) {
    return this.userModel
      .findById(userId)
      .select('+twoFactorRecoveryCodeHashes');
  }

  async consumeRecoveryCode(userId: string, remainingHashes: string[]) {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { twoFactorRecoveryCodeHashes: remainingHashes } },
    );
  }

  async findTrustedDeviceSession(
    userId: string,
    trustedDeviceTokenHash: string,
  ): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel
      .findOne({
        user: new Types.ObjectId(userId),
        trustedDeviceTokenHash,
        trustedDeviceExpiresAt: { $gt: new Date() },
      })
      .select('+trustedDeviceTokenHash');
  }

  async clearTrustedDevice(sessionId: string) {
    await this.refreshTokenModel.updateOne(
      { _id: sessionId },
      {
        $set: {
          trustedDeviceTokenHash: null,
          trustedDeviceExpiresAt: null,
        },
      },
    );
  }
}
