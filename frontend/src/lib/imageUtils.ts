// Derives processed-image URLs from a property image's original public URL.
// Lambda (prod) / NestJS webhook (local dev) writes to these prefixes automatically.

function insertPrefix(publicUrl: string, prefix: string): string {
  const lastSlash = publicUrl.lastIndexOf('/');
  return `${publicUrl.slice(0, lastSlash + 1)}${prefix}/${publicUrl.slice(lastSlash + 1)}`;
}

/** 400 px wide webp — use in listing grids and cards */
export function getThumbnailUrl(publicUrl: string): string {
  return insertPrefix(publicUrl, 'thumbnails');
}

/** Max 1500 px wide webp — use in property detail view */
export function getOptimizedUrl(publicUrl: string): string {
  return insertPrefix(publicUrl, 'optimized');
}
