import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  collection: 'two_factor_otps',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class TwoFactorOtp {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, select: false })
  otpHash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Date, default: null })
  verifiedAt: Date | null;

  createdAt?: Date;
}

export type TwoFactorOtpDocument = HydratedDocument<TwoFactorOtp>;
export const TwoFactorOtpSchema = SchemaFactory.createForClass(TwoFactorOtp);

TwoFactorOtpSchema.index({ userId: 1, verifiedAt: 1 });
TwoFactorOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
