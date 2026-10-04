// src/common/multer/multer.config.ts

import { BadRequestException } from '@nestjs/common';

import { memoryStorage } from 'multer';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const createMulterConfig = (maxFiles = 1) => ({
  storage: memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // প্রতিটি file সর্বোচ্চ 2 MB
    files: maxFiles,
  },

  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException('Only JPG, PNG and WEBP images are allowed'),
        false,
      );

      return;
    }

    callback(null, true);
  },
});

// পুরনো import ভাঙবে না
export const multerConfig = createMulterConfig(1);
