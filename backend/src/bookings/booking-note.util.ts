export type BookingAuditRole = 'OWNER' | 'SEEKER' | 'SYSTEM';

export function formatBookingHistoryLine(
  iso: Date,
  role: BookingAuditRole,
  text: string,
): string {
  const stamp = iso.toISOString();
  return `[${stamp}] ${role}: ${text.replace(/\r?\n/g, ' ').trim()}`;
}

/** Newest entries first; prepends a single line. */
export function prependBookingNoteHistory(
  existing: string | null | undefined,
  line: string,
): string {
  const next = line.trim();
  if (!next) return existing?.trim() ?? '';
  if (!existing?.trim()) return next;
  return `${next}\n${existing.trim()}`;
}
