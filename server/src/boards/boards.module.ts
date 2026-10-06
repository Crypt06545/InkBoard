// src/boards/boards.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Board, BoardSchema } from './schemas/board.schema.js';
import { BoardsService } from './boards.service.js';

import { BoardsController } from './boards.controller.js';

import { UsersModule } from '../users/users.module.js';
import { BoardAccessGuard } from './guards/board-access.guard.js';
import { ElementsService } from './elements.service.js';
import { BoardGateway } from './board.gateway.js';
import { ElementsController } from './elements.controller.js';
import { BoardRealtimeService } from './board-realtime.service.js';
import { UploadsController } from './uploads.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Board.name, schema: BoardSchema }]),
    UsersModule,
    // Gateway এ JwtService লাগবে, AuthModule এ আগে থেকেই register করা আছে কিন্তু
    // সেইটা export করা নাই, তাই এখানেও একই config দিয়ে register করছি (duplicate হলেও নিরাপদ)
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as any,
      },
    }),
  ],
  controllers: [BoardsController, ElementsController, UploadsController],
  providers: [
    BoardsService,
    ElementsService,
    BoardRealtimeService,
    BoardGateway,
    BoardAccessGuard,
  ],
  exports: [BoardsService, ElementsService],
})
export class BoardsModule {}
