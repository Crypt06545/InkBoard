// src/common/multer/multer.options.ts

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { createMulterConfig } from './multer.config.js';

// Category: ১টা image
export const ImageUpload = (fieldName = 'image') =>
  FileInterceptor(fieldName, createMulterConfig(1));

// Product: একসাথে একাধিক image (default সর্বোচ্চ 5)
export const ImagesUpload = (fieldName = 'images', maxCount = 5) =>
  FilesInterceptor(fieldName, maxCount, createMulterConfig(maxCount));
