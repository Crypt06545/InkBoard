export interface JwtAccessPayload {
  sub: string;
  email: string;
}

export interface JwtRefreshPayload {
  sub: string;
  email: string;
  sessionId: string;
}
