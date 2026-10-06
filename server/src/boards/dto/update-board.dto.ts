// src/boards/dto/update-board.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateBoardDto } from './create-board.dto.js';


export class UpdateBoardDto extends PartialType(CreateBoardDto) {}
