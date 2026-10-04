import { IsBoolean, IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2faLoginDto {
  @IsNotEmpty()
  @IsString()
  tempToken: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;

  @IsBoolean()
  trustDevice: boolean;
}
