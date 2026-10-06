import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { BoardsService } from '../boards.service.js';

@Injectable()
export class BoardAccessGuard implements CanActivate {
  constructor(private readonly boardsService: BoardsService) {}

  // Important: সবসময় JwtAccessGuard এর পরে বসাতে হবে (req.user লাগে)
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = req.user?.userId;

    if (!userId) throw new UnauthorizedException();

    const boardId = req.params.boardId;
    if (typeof boardId !== 'string') {
      throw new BadRequestException('Whiteboard id is required');
    }

    // elements ছাড়া হালকা query
    const { board, role } = await this.boardsService.getWithRole(
      boardId,
      userId,
    );

    req.board = {
      id: board._id.toString(),
      ownerId: board.ownerId.toString(),
      role,
    };
    req.boardRole = role;
    return true;
  }
}
