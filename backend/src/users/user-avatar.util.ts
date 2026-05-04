/**
 * Avatar URL resolution for Auth0-backed users.
 *
 * Primary: Auth0 `/userinfo` `picture` when it is a valid HTTPS URL.
 *
 * Fallback: generated initials avatar via ui-avatars.com (HTTPS only).
 * URL pattern:
 *   `https://ui-avatars.com/api/?name=<initials>&background=random&size=128&bold=true`
 * - `name`: URL-encoded initials (first letter of given name + first letter of family name),
 *   e.g. `Raz Bouganim` → `RB`.
 * - `background=random`: varied background color per render (see https://ui-avatars.com/).
 * - `size`, `bold`: optional visual tuning; keep URLs within VARCHAR(2048).
 */

const UI_AVATARS_BASE = 'https://ui-avatars.com/api/';

export function buildInitialsAvatarUrl(firstName: string, lastName: string): string {
  const a = (firstName.trim()[0] ?? '?').toUpperCase();
  const b = (lastName.trim()[0] ?? '?').toUpperCase();
  const initials = `${a}${b}`;
  const params = new URLSearchParams({
    name: initials,
    background: 'random',
    size: '128',
    bold: 'true',
  });
  return `${UI_AVATARS_BASE}?${params.toString()}`;
}

export function isValidHttpsProfilePictureUrl(url: string | undefined | null): boolean {
  if (url == null || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:') return false;
    if (!u.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

export function resolveAvatarUrl(
  picture: string | undefined | null,
  firstName: string,
  lastName: string,
): string {
  if (isValidHttpsProfilePictureUrl(picture)) {
    return picture!.trim();
  }
  return buildInitialsAvatarUrl(firstName, lastName);
}
