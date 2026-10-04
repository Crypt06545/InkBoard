import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  collection: 'email_verifications',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class EmailVerification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, select: false })
  tokenHash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  verifiedAt: Date | null;

  createdAt?: Date;
}

export type EmailVerificationDocument = HydratedDocument<EmailVerification>;
export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);

EmailVerificationSchema.index({ userId: 1, verifiedAt: 1 });
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
