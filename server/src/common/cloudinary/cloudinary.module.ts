// src/common/cloudinary/cloudinary.module.ts

import { Global, Module } from '@nestjs/common';

import { CloudinaryService } from './cloudinary.service.js';

@Global()
@Module({
  providers: [CloudinaryService],

  exports: [CloudinaryService],
})
export class CloudinaryModule {}
