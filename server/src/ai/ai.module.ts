// src/ai/ai.module.ts
import { Module } from '@nestjs/common';

import { AiService } from './ai.service.js';
import { BoardsModule } from '../boards/boards.module.js';
import { AiController } from './ai.controller.js';

@Module({
  imports: [BoardsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
