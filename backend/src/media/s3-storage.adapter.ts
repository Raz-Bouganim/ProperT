import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageAdapter implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly endpoint: string | undefined;
  private readonly logger = new Logger(S3StorageAdapter.name);

  constructor(private configService: ConfigService) {
    this.region = this.configService.getOrThrow<string>('AWS_REGION');
    this.bucketName = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    this.endpoint = this.configService.get<string>('S3_ENDPOINT');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
      ...(this.endpoint ? { endpoint: this.endpoint, forcePathStyle: true } : {}),
    });
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  async generatePresignedPutUrl(
    key: string,
    contentType: string,
    expiresIn: number,
  ): Promise<{ presignedUrl: string; publicUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    const publicUrl = this.endpoint
      ? `${this.endpoint}/${this.bucketName}/${key}`
      : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return { presignedUrl, publicUrl };
  }

  async getObject(key: string): Promise<Buffer> {
    const { Body } = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    if (!Body) throw new Error(`Empty body for S3 key: ${key}`);
    return Buffer.from(await Body.transformToByteArray());
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
    } catch (error: unknown) {
      const awsError = error as { Code?: string; name?: string };
      const code = awsError.Code ?? awsError.name;
      if (code === 'NoSuchKey') return;
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete object "${key}": ${msg}`);
      throw error;
    }
  }

  async ensureBucket(): Promise<void> {
    if (!this.endpoint) {
      this.logger.log(
        `Production mode (no S3_ENDPOINT): skipping bucket init — ensure "${this.bucketName}" exists and is configured in AWS.`,
      );
      return;
    }

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Bucket "${this.bucketName}" already exists.`);
    } catch {
      this.logger.log(`Bucket "${this.bucketName}" not found, creating...`);
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.logger.log(`Bucket "${this.bucketName}" created.`);
      } catch (createError: unknown) {
        const msg = createError instanceof Error ? createError.message : String(createError);
        this.logger.error(`Failed to create bucket "${this.bucketName}": ${msg}`);
        return;
      }
    }

    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };
      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucketName,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(`Public read policy applied to bucket "${this.bucketName}".`);
    } catch (policyError: unknown) {
      const msg = policyError instanceof Error ? policyError.message : String(policyError);
      this.logger.error(`Failed to set bucket policy: ${msg}`);
    }

    try {
      await this.s3Client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucketName,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: [this.configService.get<string>('FRONTEND_URL', '*')],
                AllowedMethods: ['GET', 'PUT', 'HEAD'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
      this.logger.log(`CORS policy applied to bucket "${this.bucketName}".`);
    } catch (corsError: unknown) {
      const msg = corsError instanceof Error ? corsError.message : String(corsError);
      this.logger.error(`Failed to set bucket CORS: ${msg}`);
    }
  }
}
