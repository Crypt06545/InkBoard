// src/boards/board.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { BoardsService } from './boards.service.js';
import { UsersService } from '../users/users.service.js';
import { BoardRealtimeService } from './board-realtime.service.js';

interface SocketUser {
  userId: string;
  name: string;
}

@WebSocketGateway({
  namespace: 'boards',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class BoardGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly boardsService: BoardsService,
    private readonly realtime: BoardRealtimeService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);

    // connect হওয়ার আগেই auth — handler এ client.data.user সবসময় থাকবে
    server.use(async (socket, next) => {
      try {
        await this.authenticate(socket);
        next();
      } catch {
        next(new Error('Invalid or expired token'));
      }
    });
  }

  private async authenticate(socket: Socket) {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) throw new Error('Authentication required');

    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      email?: string;
    }>(token, { secret: process.env.JWT_ACCESS_SECRET });

    const user = await this.usersService.getUserById(payload.sub);
    if (!user) throw new Error('User not found');

    // socket.data ব্যবহার করছি (Redis adapter দিয়ে scale করলেও propagate হয়)
    socket.data.user = {
      userId: payload.sub,
      name: user.name,
    } as SocketUser;
  }

  handleDisconnect(client: Socket) {
    const boardId = client.data.boardId as string | undefined;
    const user = client.data.user as SocketUser | undefined;
    if (!boardId || !user) return;

    client.to(this.room(boardId)).emit('presence:leave', { user, boardId });
  }

  private room(boardId: string) {
    return `board:${boardId}`;
  }

  @SubscribeMessage('wb:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() boardId: string,
  ) {
    const user = client.data.user as SocketUser;
    const role = await this.boardsService.getUserRole(boardId, user.userId);

    if (!role) {
      return { ok: false, error: 'No access to this whiteboard' };
    }

    client.data.boardId = boardId;
    client.data.role = role;
    await client.join(this.room(boardId));

    client.to(this.room(boardId)).emit('presence:join', { user, boardId });

    const sockets = await this.server.in(this.room(boardId)).fetchSockets();
    const seen = new Set([user.userId]);
    const viewers: SocketUser[] = [];

    for (const s of sockets) {
      const u = s.data?.user as SocketUser | undefined;
      if (!u || seen.has(u.userId)) continue;
      seen.add(u.userId);
      viewers.push(u);
    }

    client.emit('presence:sync', { boardId, users: viewers });
    return { ok: true };
  }

  @SubscribeMessage('wb:leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() boardId: string,
  ) {
    const user = client.data.user as SocketUser;
    await client.leave(this.room(boardId));
    client.to(this.room(boardId)).emit('presence:leave', { user, boardId });
  }

  @SubscribeMessage('presence:cursor')
  handleCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string; x: number; y: number },
  ) {
    // join না করা board এ emit করা যাবে না
    if (!client.rooms.has(this.room(data?.boardId))) return;

    const user = client.data.user as SocketUser;
    client
      .to(this.room(data.boardId))
      .emit('presence:cursor', { user, x: data.x, y: data.y });
  }

  // Drag এর সময় প্রতি frame এ broadcast, DB তে save হয় না।
  // Drag শেষে REST PATCH এ persist + element:updated broadcast হয়
  @SubscribeMessage('element:live')
  handleElementLive(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string; element: unknown },
  ) {
    if (!client.rooms.has(this.room(data?.boardId))) return;
    if (client.data.role === 'viewer') return;

    const user = client.data.user as SocketUser;
    client
      .to(this.room(data.boardId))
      .emit('element:live', { element: data.element, by: user.userId });
  }
}
