import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaProcessorService } from './media-processor.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guards';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(
    private mediaService: MediaService,
    private mediaProcessorService: MediaProcessorService,
  ) {}

  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a presigned URL for direct S3 upload' })
  async getPresignedUrl(
    @Body() body: { fileName: string; contentType: string; fileSize?: number },
  ) {
    return this.mediaService.getPresignedUrl(
      body.fileName,
      body.contentType,
      body.fileSize,
    );
  }

  // Called by MinIO webhook notifications in local dev.
  // In production this path is unused — Lambda handles processing via S3 events.
  @Post('s3-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MinIO S3 event webhook (local dev only)' })
  async s3Webhook(
    @Body()
    body: {
      Records?: Array<{ s3: { object: { key: string } } }>;
    },
  ) {
    const records = body.Records ?? [];
    await Promise.allSettled(
      records.map(
        ({
          s3: {
            object: { key },
          },
        }) =>
          this.mediaProcessorService.processUploadedImage(
            decodeURIComponent(key.replace(/\+/g, ' ')),
          ),
      ),
    );
    return { ok: true };
  }
}
