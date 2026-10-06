// src/boards/boards.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { BoardsService } from './boards.service.js';

import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { BoardAccessGuard } from './guards/board-access.guard.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { CreateBoardDto } from './dto/create-board.dto.js';
import { UpdateBoardDto } from './dto/update-board.dto.js';

@UseGuards(JwtAccessGuard)
@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  create(@Body() dto: CreateBoardDto, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.boardsService.create(dto, userId);
  }

  @Get()
  findAll(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.boardsService.findAllForUser(userId);
  }

  @UseGuards(BoardAccessGuard)
  @Get(':boardId')
  findOne(@Param('boardId') boardId: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.boardsService.getFullBoard(boardId, userId);
  }

  @UseGuards(BoardAccessGuard)
  @Patch(':boardId')
  update(
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const socketId = req.get('x-socket-id');
    return this.boardsService.update(boardId, dto, userId, socketId);
  }

  @UseGuards(BoardAccessGuard)
  @Delete(':boardId')
  remove(@Param('boardId') boardId: string, @Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.boardsService.remove(boardId, userId);
  }

  @UseGuards(BoardAccessGuard)
  @Post(':boardId/members')
  addMember(
    @Param('boardId') boardId: string,
    @Body() dto: InviteMemberDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.boardsService.addMember(boardId, dto.email, dto.role, userId);
  }

  @UseGuards(BoardAccessGuard)
  @Delete(':boardId/members/:memberUserId')
  removeMember(
    @Param('boardId') boardId: string,
    @Param('memberUserId') memberUserId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.boardsService.removeMember(boardId, memberUserId, userId);
  }
}
