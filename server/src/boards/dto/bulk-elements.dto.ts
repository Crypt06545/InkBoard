// src/boards/dto/bulk-elements.dto.ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateElementDto } from './create-element.dto.js';

export class BulkCreateElementsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateElementDto)
  elements: CreateElementDto[];
}
