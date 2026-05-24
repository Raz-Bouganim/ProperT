import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { S3StorageAdapter } from './s3-storage.adapter';

@Injectable()
export class MediaProcessorService {
  private readonly logger = new Logger(MediaProcessorService.name);

  constructor(private s3Adapter: S3StorageAdapter) {}

  async processUploadedImage(key: string): Promise<void> {
    if (key.startsWith('thumbnails/') || key.startsWith('optimized/')) return;

    this.logger.log(`Processing image: ${key}`);

    const buffer = await this.s3Adapter.getObject(key);

    const [thumbnail, optimized] = await Promise.all([
      sharp(buffer)
        .resize({ width: 400, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
      sharp(buffer)
        .resize({ width: 1500, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
    ]);

    await Promise.all([
      this.s3Adapter.putObject(`thumbnails/${key}`, thumbnail, 'image/webp'),
      this.s3Adapter.putObject(`optimized/${key}`, optimized, 'image/webp'),
    ]);

    this.logger.log(`Done: thumbnails/${key} + optimized/${key}`);
  }
}
