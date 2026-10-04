// src/types/express.d.ts
export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId?: string;
  refreshToken?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
