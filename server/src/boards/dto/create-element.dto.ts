// src/boards/dto/create-element.dto.ts
import { IsIn, IsNumber, IsObject, IsOptional } from 'class-validator';
import { VALID_ELEMENT_TYPES } from '../schemas/board.schema.js';

export class CreateElementDto {
  @IsIn(VALID_ELEMENT_TYPES) type: string;
  @IsOptional() @IsObject() data?: Record<string, any>;
  @IsOptional() @IsNumber() z?: number;
}
