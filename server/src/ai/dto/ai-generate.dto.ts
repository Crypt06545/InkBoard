// src/ai/dto/ai-generate.dto.ts
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AiGenerateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  topic: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) count?: number;
  @IsOptional() @Type(() => Number) @IsNumber() x?: number;
  @IsOptional() @Type(() => Number) @IsNumber() y?: number;
}
