import sharp from 'sharp';

export async function processImage(
  buffer: Buffer,
): Promise<{ thumbnail: Buffer; optimized: Buffer }> {
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
  return { thumbnail, optimized };
}
