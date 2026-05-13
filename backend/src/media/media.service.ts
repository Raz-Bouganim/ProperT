import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class MediaService implements OnModuleInit {
  private s3Client: S3Client;
  private readonly logger = new Logger(MediaService.name);

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION')!,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        )!,
      },
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      forcePathStyle: true, // Required for MinIO
    });
  }

  async onModuleInit() {
    const bucketName = this.configService.get<string>('S3_BUCKET_NAME');
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      this.logger.log(`Bucket "${bucketName}" already exists.`);
    } catch (error: unknown) {
      void error;
      this.logger.log(`Bucket "${bucketName}" does not exist. Creating...`);
      try {
        await this.s3Client.send(
          new CreateBucketCommand({ Bucket: bucketName }),
        );
        this.logger.log(`Bucket "${bucketName}" created successfully.`);
      } catch (createError: unknown) {
        const msg =
          createError instanceof Error
            ? createError.message
            : String(createError);
        this.logger.error(`Failed to create bucket "${bucketName}": ${msg}`);
      }
    }

    // Apply Public Read Policy
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(`Public read policy applied to bucket "${bucketName}".`);
    } catch (policyError: unknown) {
      const msg =
        policyError instanceof Error
          ? policyError.message
          : String(policyError);
      this.logger.error(`Failed to set bucket policy: ${msg}`);
    }
  }

  async getPresignedUrl(fileName: string, contentType: string) {
    const bucketName = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    const key = `${uuidv4()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      });
      const endpoint = this.configService.getOrThrow<string>('S3_ENDPOINT');
      return {
        url,
        key,
        publicUrl: `${endpoint}/${bucketName}/${key}`,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating presigned URL: ${msg}`);
      throw new InternalServerErrorException('Could not generate upload URL');
    }
  }
}
