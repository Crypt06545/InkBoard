// src/boards/uploads.controller.ts
import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { BoardAccessGuard } from './guards/board-access.guard.js';
import { BoardEditGuard } from './guards/board-edit.guard.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { ImageUpload } from '../common/multer/multer.options.js';

@UseGuards(JwtAccessGuard, BoardAccessGuard, BoardEditGuard)
@Controller('boards/:boardId/uploads')
export class UploadsController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post()
  @UseInterceptors(ImageUpload())
  upload(
    @Param('boardId') boardId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Image file is required');

    return this.cloudinary.uploadImage(file, `whiteboards/${boardId}`);
  }
}
