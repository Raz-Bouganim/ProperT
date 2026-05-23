import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { S3StorageAdapter } from './s3-storage.adapter';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private s3Adapter: S3StorageAdapter) {}

  async getPresignedUrl(fileName: string, contentType: string, fileSize?: number) {
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      throw new BadRequestException(`File type '${contentType}' is not allowed`);
    }
    if (fileSize !== undefined && fileSize > MAX_FILE_BYTES) {
      throw new BadRequestException('File exceeds the 100 MB size limit');
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${uuidv4()}-${safeName}`;

    try {
      const { presignedUrl, publicUrl } = await this.s3Adapter.generatePresignedPutUrl(
        key,
        contentType,
        3600,
      );
      return { url: presignedUrl, key, publicUrl };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating presigned URL: ${msg}`);
      throw new InternalServerErrorException('Could not generate upload URL');
    }
  }
}
