// src/boards/dto/create-board.dto.ts
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { BoardBackground } from '../schemas/board.schema.js';

export class CreateBoardDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional()
  @IsIn(Object.values(BoardBackground))
  background?: BoardBackground;
  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) bgColor?: string;
}
