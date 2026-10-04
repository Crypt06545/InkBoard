import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum UserStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  SUSPENDED = 'Suspended',
}

export enum UserType {
  USER = 'User',
  ADMIN = 'Admin',
  SELLER = 'Seller',
}

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ type: String, required: true, select: false })
  password: string;

  @Prop({ type: String, default: '', trim: true })
  avatar: string;

  @Prop({ type: String, default: null, trim: true })
  mobile: string | null;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    index: true,
  })
  status: UserStatus;

  @Prop({ type: String, enum: UserType, default: UserType.USER, index: true })
  userType: UserType;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  @Prop({ type: Date, default: null })
  emailVerifiedAt: Date | null;

  @Prop({ type: Date, default: null })
  passwordChangedAt: Date | null;

  @Prop({ type: Number, default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lockedUntil: Date | null;

  @Prop({ type: Boolean, default: false })
  twoFactorEnabled: boolean;

  @Prop({ type: String, default: null, select: false })
  twoFactorSecret: string | null;

  @Prop({ type: [String], default: [], select: false })
  twoFactorRecoveryCodeHashes: string[];

  @Prop({ type: String, default: null, select: false })
  passwordResetOtpHash: string | null;

  @Prop({ type: Date, default: null, select: false })
  passwordResetOtpExpiresAt: Date | null;

  @Prop({ type: Number, default: 0, select: false })
  passwordResetAttempts: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ userType: 1, status: 1 });
UserSchema.index({ lastLoginAt: -1 });
