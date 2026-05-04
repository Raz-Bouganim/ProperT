import { randomBytes } from 'crypto';

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return base.length > 0 ? base : 'listing';
}

/** Append short suffix so collisions are extremely unlikely without extra DB round-trips. */
export function makeUniqueSlugCandidate(base: string): string {
  const suffix = randomBytes(3).toString('hex');
  const maxBase = 200 - 1 - suffix.length;
  const trimmed = base.slice(0, Math.max(1, maxBase));
  return `${trimmed}-${suffix}`;
}
