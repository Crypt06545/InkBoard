// src/ai/dto/edit-selection.dto.ts
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class EditSelectionDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) instruction: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];
}
