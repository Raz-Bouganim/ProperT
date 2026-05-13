import { PropertyStatus } from '@prisma/client';

/** Parse UI strings like "12 Months" or "Flexible / Short Term" + Prisma month count. */
export function parseLeaseDurationInput(
  leaseDuration?: string | null,
): number | null {
  if (leaseDuration == null || !String(leaseDuration).trim()) return null;
  const s = String(leaseDuration).trim();
  if (/^flexible/i.test(s)) return null;
  const digits = s.replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function formatLeaseDurationLabel(
  status: PropertyStatus,
  leaseDurationMonths: number | null,
): string | null {
  if (status !== PropertyStatus.FOR_RENT) return null;
  if (leaseDurationMonths == null) return 'Flexible lease';
  return `${leaseDurationMonths} month${leaseDurationMonths === 1 ? '' : 's'}`;
}
