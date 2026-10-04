import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema.js';

@Schema({
  collection: 'refresh_tokens',
  timestamps: true,
  versionKey: false,
})
export class RefreshToken {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    select: false,
  })
  tokenHash: string;

  @Prop({
    type: String,
    default: 'Unknown Device',
  })
  deviceName: string;

  @Prop({
    type: String,
    default: null,
  })
  userAgent: string | null;

  @Prop({
    type: String,
    default: null,
  })
  ipAddress: string | null;

  @Prop({
    type: Date,
    required: true,
  })
  expiresAt: Date;

  // Trusted device token hash
  @Prop({
    type: String,
    default: null,
    select: false,
    index: true,
  })
  trustedDeviceTokenHash: string | null;

  // Trusted device validity
  @Prop({
    type: Date,
    default: null,
    index: true,
  })
  trustedDeviceExpiresAt: Date | null;

  // Last successful 2FA verification
  @Prop({
    type: Date,
    default: null,
  })
  twoFactorVerifiedAt: Date | null;

  @Prop({
    type: Boolean,
    default: false,
  })
  isRevoked: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

RefreshTokenSchema.index({
  user: 1,
  isRevoked: 1,
});

RefreshTokenSchema.index({
  trustedDeviceTokenHash: 1,
  trustedDeviceExpiresAt: 1,
});
