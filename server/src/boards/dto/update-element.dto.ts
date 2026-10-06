// src/boards/dto/update-element.dto.ts
import { IsNumber, IsObject, IsOptional } from 'class-validator';

export class UpdateElementDto {
  @IsOptional() @IsObject() data?: Record<string, any>;
  @IsOptional() @IsNumber() z?: number;
}
