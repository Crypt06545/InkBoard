// src/auth/dto/disable-2fa.dto.ts
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Disable2faDto {
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;
}
