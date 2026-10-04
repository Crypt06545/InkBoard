// auth.module.ts

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy.js';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy.js';
import { MailerModule } from '../common/mailer/mailer.module.js';
import { TwoFactorService } from './two-factor.service.js';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailerModule,

    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as any,
      },
    }),

    BullModule.registerQueue({
      name: 'email-queue',
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    TwoFactorService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
  ],

  exports: [JwtModule],
})
export class AuthModule {}
