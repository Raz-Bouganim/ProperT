import { BookingStatus } from '@prisma/client';

/** Statuses that occupy the property calendar for overlap checks and open-slot blocking. */
export const BOOKING_SLOT_BLOCKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];
