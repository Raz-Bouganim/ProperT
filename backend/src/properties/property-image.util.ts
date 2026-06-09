/**
 * Persist storage path for MinIO/S3-style URLs; keeps `url` as the public fetch URL.
 * Falls back to a trimmed copy of `url` when parsing fails.
 *
 * Pass `bucketNameToStrip` for MinIO path-style URLs (/{bucket}/{key}) so the bucket
 * prefix is removed, leaving only the object key. For AWS virtual-hosted URLs
 * (https://{bucket}.s3…/{key}) the bucket is in the hostname, so the raw pathname
 * already equals the key — no stripping is needed.
 */
export function publicUrlToObjectKey(
  url: string,
  bucketNameToStrip?: string,
): string {
  try {
    const u = new URL(url);
    let path = u.pathname.replace(/^\//, '');
    if (bucketNameToStrip && path.startsWith(`${bucketNameToStrip}/`)) {
      path = path.slice(bucketNameToStrip.length + 1);
    }
    return path.length > 0 ? path.slice(0, 1024) : url.slice(0, 1024);
  } catch {
    return url.slice(0, 1024);
  }
}
