import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { S3StorageAdapter } from './s3-storage.adapter';
import { MediaProcessorService } from './media-processor.service';

@Module({
  imports: [ConfigModule],
  controllers: [MediaController],
  providers: [MediaService, S3StorageAdapter, MediaProcessorService],
  exports: [MediaService, S3StorageAdapter, MediaProcessorService],
})
export class MediaModule {}
