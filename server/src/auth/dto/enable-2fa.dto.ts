// src/auth/dto/enable-2fa.dto.ts
import { IsNotEmpty, Length } from 'class-validator';

export class Enable2faDto {
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;
}
