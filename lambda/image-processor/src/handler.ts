import { S3Event, S3Handler } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { processImage } from './processor';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });

export const handler: S3Handler = async (event: S3Event) => {
  await Promise.allSettled(
    event.Records.map(async (record) => {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, ' '),
      );

      if (key.startsWith('thumbnails/') || key.startsWith('optimized/')) return;

      const { Body, ContentType } = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );

      if (!Body || !ContentType?.startsWith('image/')) return;

      const input = Buffer.from(await Body.transformToByteArray());
      const { thumbnail, optimized } = await processImage(input);

      await Promise.all([
        s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `thumbnails/${key}`,
            Body: thumbnail,
            ContentType: 'image/webp',
          }),
        ),
        s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `optimized/${key}`,
            Body: optimized,
            ContentType: 'image/webp',
          }),
        ),
      ]);
    }),
  );
};
