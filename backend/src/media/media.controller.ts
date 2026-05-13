import { Controller, Post, Body } from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('presigned-url')
  @ApiOperation({ summary: 'Get a presigned URL for direct S3 upload' })
  async getPresignedUrl(
    @Body() body: { fileName: string; contentType: string },
  ) {
    return this.mediaService.getPresignedUrl(body.fileName, body.contentType);
  }
}
