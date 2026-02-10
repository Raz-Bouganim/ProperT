import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
    constructor(private prisma: PrismaService) { }

    async create(createBookingDto: {
        listingId: string;
        seekerId: string;
        startTime: Date;
        endTime: Date;
        notes?: string;
    }) {
        // Basic validation: ensure end > start
        if (createBookingDto.endTime <= createBookingDto.startTime) {
            throw new BadRequestException('End time must be after start time');
        }

        // Check if user already has a booking for this listing
        const existingUserBooking = await this.prisma.booking.findFirst({
            where: {
                listingId: createBookingDto.listingId,
                seekerId: createBookingDto.seekerId,
                status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            },
        });

        if (existingUserBooking) {
            throw new BadRequestException('You already have a booking for this property');
        }

        // Check for slot conflicts
        const conflict = await this.prisma.booking.findFirst({
            where: {
                listingId: createBookingDto.listingId,
                status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
                OR: [
                    {
                        startTime: { lt: createBookingDto.endTime },
                        endTime: { gt: createBookingDto.startTime },
                    },
                ],
            },
        });

        if (conflict) {
            throw new BadRequestException('This slot is already booked');
        }

        return this.prisma.booking.create({
            data: {
                ...createBookingDto,
                status: BookingStatus.PENDING,
            },
        });
    }

    async findAllByUser(userId: string, role: 'SEEKER' | 'OWNER') {
        if (role === 'SEEKER') {
            return this.prisma.booking.findMany({
                where: { seekerId: userId },
                include: { listing: true },
                orderBy: { startTime: 'desc' },
            });
        } else {
            // Owner sees bookings for their listings
            return this.prisma.booking.findMany({
                where: { listing: { ownerId: userId } },
                include: { listing: true, seeker: { select: { firstName: true, lastName: true, email: true } } },
                orderBy: { startTime: 'desc' },
            });
        }
    }

    async updateStatus(id: string, status: BookingStatus, userId: string) {
        // Verify ownership
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: { listing: true },
        });

        if (!booking) throw new NotFoundException('Booking not found');

        if (booking.listing.ownerId !== userId) {
            throw new BadRequestException('Only the owner can update status');
        }

        return this.prisma.booking.update({
            where: { id },
            data: { status },
        });
    }
}
