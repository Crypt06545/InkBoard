// src/boards/elements.controller.ts
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { BoardAccessGuard } from './guards/board-access.guard.js';
import { CreateElementDto } from './dto/create-element.dto.js';
import { BulkCreateElementsDto } from './dto/bulk-elements.dto.js';
import { UpdateElementDto } from './dto/update-element.dto.js';
import { ElementsService } from './elements.service.js';

@UseGuards(JwtAccessGuard, BoardAccessGuard)
@Controller('boards/:boardId/elements')
export class ElementsController {
  constructor(private readonly elementsService: ElementsService) {}

  // Element এর নিজের "data" field আছে, তাই সরাসরি return করলে ResponseInterceptor
  // শুধু element.data পাঠিয়ে দিত। { data: element } দিলে পুরো element যায়।
  @Post()
  async create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateElementDto,
    @Req() req: Request,
    @Headers('x-socket-id') socketId?: string,
  ) {
    this.assertCanEdit(req);
    const userId = (req.user as { userId: string }).userId;
    const element = await this.elementsService.create(
      boardId,
      userId,
      dto.type,
      dto.data ?? {},
      dto.z,
      socketId,
    );
    return { data: element };
  }

  @Post('bulk')
  bulkCreate(
    @Param('boardId') boardId: string,
    @Body() dto: BulkCreateElementsDto,
    @Req() req: Request,
    @Headers('x-socket-id') socketId?: string,
  ) {
    this.assertCanEdit(req);
    const userId = (req.user as { userId: string }).userId;
    return this.elementsService.bulkCreate(
      boardId,
      userId,
      dto.elements,
      socketId,
    );
  }

  @Patch(':elementId')
  async update(
    @Param('boardId') boardId: string,
    @Param('elementId') elementId: string,
    @Body() dto: UpdateElementDto,
    @Req() req: Request,
    @Headers('x-socket-id') socketId?: string,
  ) {
    this.assertCanEdit(req);
    const element = await this.elementsService.update(
      boardId,
      elementId,
      dto,
      socketId,
    );
    return { data: element };
  }

  @Delete(':elementId')
  remove(
    @Param('boardId') boardId: string,
    @Param('elementId') elementId: string,
    @Req() req: Request,
    @Headers('x-socket-id') socketId?: string,
  ) {
    this.assertCanEdit(req);
    return this.elementsService.remove(boardId, elementId, socketId);
  }

  private assertCanEdit(req: Request) {
    if (req.boardRole === 'viewer') {
      throw new ForbiddenException(
        'You do not have permission to edit this whiteboard',
      );
    }
  }
}
