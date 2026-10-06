import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { CollaboratorRole } from '../schemas/board.schema.js';

// BoardAccessGuard এর পরে বসাতে হবে
@Injectable()
export class BoardEditGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (!req.boardRole || req.boardRole === CollaboratorRole.VIEWER) {
      throw new ForbiddenException(
        'You do not have permission to edit this whiteboard',
      );
    }
    return true;
  }
}
