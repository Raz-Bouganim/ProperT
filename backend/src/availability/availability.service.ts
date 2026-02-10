import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
    constructor(private prisma: PrismaService) { }

    async setAvailability(listingId: string, schedule: { dayOfWeek: number; startTime: string; endTime: string }[]) {
        // Transaction: clear old schedule, insert new
        return this.prisma.$transaction(async (tx) => {
            await tx.availability.deleteMany({ where: { listingId } });
            if (schedule.length > 0) {
                await tx.availability.createMany({
                    data: schedule.map((s) => ({
                        listingId,
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime,
                        endTime: s.endTime,
                    })),
                });
            }
        });
    }

    async getAvailability(listingId: string) {
        return this.prisma.availability.findMany({
            where: { listingId },
            orderBy: { dayOfWeek: 'asc' },
        });
    }

    // The "Smart" part: calculate discrete slots - booked slots
    async getOpenSlots(listingId: string, date: Date) {
        console.log(`[AvailabilityService] Calculating slots for listing: ${listingId} on date: ${date.toISOString()}`);
        const dayOfWeek = date.getDay(); // 0-6 (Sun-Sat)

        // 1. Get availability for this day
        const availability = await this.prisma.availability.findFirst({
            where: { listingId, dayOfWeek },
        });

        if (!availability) {
            console.log(`[AvailabilityService] No availability found for day of week: ${dayOfWeek}`);
            return [];
        }

        // 2. Get existing bookings for this day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await this.prisma.booking.findMany({
            where: {
                listingId,
                startTime: { gte: startOfDay },
                endTime: { lte: endOfDay },
                status: { not: 'REJECTED' }, // Pending or Confirmed blocks the slot
                // also exclude cancelled?
            },
        });

        // 3. Generate slots (30 min intervals)
        const slots: string[] = [];
        let current = this.parseTime(availability.startTime);
        const end = this.parseTime(availability.endTime);

        while (current < end) {
            const slotStart = this.formatTime(current);
            // next slot is +30 mins
            const nextTime = new Date(current.getTime() + 30 * 60000);
            const slotEnd = this.formatTime(nextTime);

            if (nextTime > end) break;

            // Check collision
            const isBooked = bookings.some(b => {
                const bStart = b.startTime;
                const bEnd = b.endTime;

                // Construct Date objects for slot
                const slotStartDate = new Date(date);
                const [h, m] = slotStart.split(':').map(Number);
                slotStartDate.setHours(h, m, 0, 0);

                const slotEndDate = new Date(date);
                const [eh, em] = slotEnd.split(':').map(Number);
                slotEndDate.setHours(eh, em, 0, 0);

                // Overlap check
                return (slotStartDate < bEnd && slotEndDate > bStart);
            });

            if (!isBooked) {
                slots.push(slotStart);
            }

            current = nextTime;
        }

        return slots;
    }

    private parseTime(timeStr: string): Date {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
    }

    private formatTime(date: Date): string {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
}
