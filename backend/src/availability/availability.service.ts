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
        const dayOfWeek = date.getDay();

        // 1. Get availability for this day
        const availability = await this.prisma.availability.findFirst({
            where: { listingId, dayOfWeek },
        });

        if (!availability) return [];

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
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
        });

        // 3. Generate slots (30 min intervals)
        const slots: string[] = [];
        const [startH, startM] = availability.startTime.split(':').map(Number);
        const [endH, endM] = availability.endTime.split(':').map(Number);

        const current = new Date(date);
        current.setHours(startH, startM, 0, 0);

        const endLimit = new Date(date);
        endLimit.setHours(endH, endM, 0, 0);

        while (current < endLimit) {
            const slotStart = new Date(current);
            const slotEnd = new Date(current.getTime() + 30 * 60000);

            if (slotEnd > endLimit) break;

            const isBooked = bookings.some(b => {
                const bStart = new Date(b.startTime);
                const bEnd = new Date(b.endTime);
                return (slotStart < bEnd && slotEnd > bStart);
            });

            if (!isBooked) {
                slots.push(this.formatTime(slotStart));
            }

            current.setTime(current.getTime() + 30 * 60000);
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
