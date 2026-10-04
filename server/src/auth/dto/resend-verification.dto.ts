// src/auth/dto/resend-verification.dto.ts
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;
}
