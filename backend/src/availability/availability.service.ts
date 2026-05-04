import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, type PropertyAvailability } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { AVAILABILITY_SLOT_MINUTES } from './availability.constants';

/**
 * Open-slot API (`GET .../availability/slots`): response items are `HH:mm` strings in the property's
 * `timeZone` (wall-clock local to that listing). The client passes `date=YYYY-MM-DD`; that date is
 * interpreted as a calendar day in the property time zone.
 *
 * Publishing and creating a property do not require any `property_availabilities` rows.
 *
 * If there are no availability rules for a property, `getOpenSlots` returns an empty list (no
 * generated bookable windows). Some clients still allow choosing any calendar day when the rules
 * array is empty; see frontend booking flow.
 */
@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async setAvailability(
    propertyId: string,
    schedule: { dayOfWeek?: number; date?: string; startTime: string; endTime: string }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.propertyAvailability.deleteMany({ where: { propertyId } });
      if (schedule.length > 0) {
        await tx.propertyAvailability.createMany({
          data: schedule.map((s) => ({
            propertyId,
            dayOfWeek: s.dayOfWeek ?? null,
            date: s.date ? new Date(s.date) : null,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
    });
  }

  async getAvailability(propertyId: string) {
    return this.prisma.propertyAvailability.findMany({
      where: { propertyId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async getOpenSlots(propertyId: string, dateString: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { timeZone: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const tz = property.timeZone;
    const parts = dateString.split('-').map((s) => Number(s));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
      throw new BadRequestException('Invalid date');
    }
    const [year, month, day] = parts;
    const dayStart = DateTime.fromObject({ year, month, day }, { zone: tz }).startOf('day');
    if (!dayStart.isValid) {
      throw new BadRequestException('Invalid date');
    }

    const jsDay = dayStart.weekday === 7 ? 0 : dayStart.weekday;

    const nextDayStart = dayStart.plus({ days: 1 });

    const rules = await this.prisma.propertyAvailability.findMany({
      where: {
        propertyId,
        OR: [{ dayOfWeek: jsDay }, { date: { not: null } }],
      },
      orderBy: [{ startTime: 'asc' }],
    });

    const availabilities = rules.filter((r: PropertyAvailability) => {
      if (r.dayOfWeek != null) {
        return r.dayOfWeek === jsDay;
      }
      if (r.date != null) {
        const ruleLocal = DateTime.fromJSDate(r.date).setZone(tz);
        return ruleLocal.year === year && ruleLocal.month === month && ruleLocal.day === day;
      }
      return false;
    });

    // No explicit windows for this local day — nothing bookable via generated slots.
    if (availabilities.length === 0) {
      return [];
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startTime: { lt: nextDayStart.toJSDate() },
        endTime: { gt: dayStart.toJSDate() },
      },
    });

    const slotSet = new Set<string>();

    for (const availability of availabilities) {
      const [startH, startM] = availability.startTime.split(':').map(Number);
      const [endH, endM] = availability.endTime.split(':').map(Number);

      let current = dayStart.set({ hour: startH, minute: startM, second: 0, millisecond: 0 });
      const endLimit = dayStart.set({ hour: endH, minute: endM, second: 0, millisecond: 0 });

      while (current < endLimit) {
        const slotStart = current;
        const slotEnd = current.plus({ minutes: AVAILABILITY_SLOT_MINUTES });

        if (slotEnd > endLimit) break;

        const overlapsBooked = bookings.some((b) => {
          const bStart = DateTime.fromJSDate(b.startTime);
          const bEnd = DateTime.fromJSDate(b.endTime);
          return slotStart.toMillis() < bEnd.toMillis() && slotEnd.toMillis() > bStart.toMillis();
        });

        if (!overlapsBooked) {
          slotSet.add(slotStart.toFormat('HH:mm'));
        }

        current = current.plus({ minutes: AVAILABILITY_SLOT_MINUTES });
      }
    }

    return Array.from(slotSet).sort();
  }
}
