/**
 * Persist storage path for MinIO/S3-style URLs; keeps `url` as the public fetch URL.
 * Falls back to a trimmed copy of `url` when parsing fails.
 */
export function publicUrlToObjectKey(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, '');
    return path.length > 0 ? path.slice(0, 1024) : url.slice(0, 1024);
  } catch {
    return url.slice(0, 1024);
  }
}
