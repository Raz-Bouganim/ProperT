import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { S3StorageAdapter } from './s3-storage.adapter';

@Module({
  imports: [ConfigModule],
  controllers: [MediaController],
  providers: [MediaService, S3StorageAdapter],
  exports: [MediaService, S3StorageAdapter],
})
export class MediaModule {}
