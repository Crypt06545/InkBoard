// src/auth/dto/verify-recovery-code.dto.ts
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class VerifyRecoveryCodeDto {
  @IsNotEmpty()
  @IsString()
  tempToken: string;

  @IsNotEmpty()
  @IsString()
  recoveryCode: string;

  @IsBoolean()
  trustDevice: boolean;
}
