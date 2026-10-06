// src/boards/board-realtime.service.ts
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class BoardRealtimeService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  private room(boardId: string) {
    return `board:${boardId}`;
  }

  // exceptSocketId দিলে যে socket নিজে REST call করেছে তাকে বাদ দিয়ে broadcast হবে
  emitToBoard(
    boardId: string,
    event: string,
    payload: unknown,
    exceptSocketId?: string,
  ) {
    if (!this.server) return;
    const channel = exceptSocketId
      ? this.server.to(this.room(boardId)).except(exceptSocketId)
      : this.server.to(this.room(boardId));
    channel.emit(event, payload);
  }

  // Member সরানোর পর তার socket গুলো room থেকে বের করে দেয়
  async removeUserFromBoard(boardId: string, userId: string) {
    if (!this.server) return;

    const sockets = await this.server.in(this.room(boardId)).fetchSockets();

    for (const s of sockets) {
      const user = s.data?.user as { userId?: string } | undefined;
      if (user?.userId === userId) s.leave(this.room(boardId));
    }
  }
}
