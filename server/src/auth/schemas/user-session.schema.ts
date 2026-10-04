import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';


@Schema({
  collection: 'user_sessions',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class UserSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, default: null, index: true })
  deviceId: string | null;



  @Prop({ type: String, default: null, trim: true })
  deviceLabel: string | null;

  @Prop({ type: String, default: null })
  deviceType: string | null;

  @Prop({ type: String, default: null })
  browser: string | null;

  @Prop({ type: String, default: null })
  operatingSystem: string | null;

  @Prop({ type: String, default: null })
  userAgent: string | null;

  @Prop({ type: String, default: null })
  ipAddress: string | null;

  // ─── Session security ───

  @Prop({ type: String, required: true, select: false })
  refreshTokenHash: string;


  @Prop({ type: String, default: null, select: false })
  previousRefreshTokenHash: string | null;

  @Prop({ type: Date, default: Date.now })
  lastActiveAt: Date;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  createdAt?: Date;
}

export type UserSessionDocument = HydratedDocument<UserSession>;
export const UserSessionSchema = SchemaFactory.createForClass(UserSession);


UserSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });


UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
