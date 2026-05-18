import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guards';

@ApiTags('media')
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('presigned-url')
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
}
