import type { CollaboratorRole } from '../boards/schemas/board.schema.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId?: string;
  refreshToken?: string;
}

export interface BoardAccess {
  id: string;
  ownerId: string;
  role: 'owner' | CollaboratorRole;
}

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}

    interface Request {
      user?: AuthenticatedUser;
      board?: BoardAccess;
      boardRole?: 'owner' | CollaboratorRole;
    }
  }
}

export {};
