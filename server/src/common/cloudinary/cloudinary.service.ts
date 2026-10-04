// src/common/cloudinary/cloudinary.service.ts

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface UploadedImage {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET_KEY,
    });
  }

  // একটা image (Category)
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadedImage> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    try {
      const result = await this.uploadBuffer(file.buffer, folder);

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      this.logger.error(`Cloudinary upload failed: ${String(error)}`);

      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  // একাধিক image (Product) — all or nothing
  async uploadImages(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<UploadedImage[]> {
    if (!files?.length) {
      return [];
    }

    const results = await Promise.allSettled(
      files.map((file) => this.uploadBuffer(file.buffer, folder)),
    );

    const uploaded: UploadedImage[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        uploaded.push({
          url: result.value.secure_url,
          publicId: result.value.public_id,
        });
      } else {
        this.logger.error(`Cloudinary upload failed: ${String(result.reason)}`);
      }
    }

    // একটাও fail হলে বাকিগুলো rollback
    if (uploaded.length !== files.length) {
      await this.deleteImages(uploaded.map((image) => image.publicId));

      throw new InternalServerErrorException('Failed to upload images');
    }

    return uploaded;
  }

  // Best-effort: delete fail করলে main request fail করবে না
  async deleteImage(publicId?: string | null): Promise<void> {
    if (!publicId) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId}: ${String(error)}`);
    }
  }

  async deleteImages(
    publicIds: Array<string | null | undefined>,
  ): Promise<void> {
    await Promise.all(publicIds.map((publicId) => this.deleteImage(publicId)));
  }

  private uploadBuffer(
    buffer: Buffer,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }

          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }
}
