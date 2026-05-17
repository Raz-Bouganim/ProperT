import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { BOOKING_SLOT_BLOCKING_STATUSES } from './booking-status.constants';
import {
  formatBookingHistoryLine,
  prependBookingNoteHistory,
  type BookingAuditRole,
} from './booking-note.util';

const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.REJECTED,
  BookingStatus.CANCELLED,
  BookingStatus.COMPLETED,
  BookingStatus.LAPSED,
];

type BookingRow = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  notes: string | null;
  noteHistory: string | null;
  seekerId: string;
  propertyId: string;
};

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private availability: AvailabilityService,
  ) {}

  async create(createBookingDto: {
    propertyId: string;
    seekerId: string;
    startTime: Date;
    endTime: Date;
    notes?: string;
  }) {
    const property = await this.prisma.property.findUnique({
      where: { id: createBookingDto.propertyId },
      select: { ownerId: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId === createBookingDto.seekerId) {
      throw new ForbiddenException('You cannot book a viewing for your own property');
    }

    await this.availability.assertBookableWindow(
      createBookingDto.propertyId,
      createBookingDto.startTime,
      createBookingDto.endTime,
    );

    const existingUserBooking = await this.prisma.booking.findFirst({
      where: {
        propertyId: createBookingDto.propertyId,
        seekerId: createBookingDto.seekerId,
        status: { in: [...BOOKING_SLOT_BLOCKING_STATUSES] },
      },
    });

    if (existingUserBooking) {
      throw new BadRequestException(
        'You already have a booking for this property',
      );
    }

    const initialNote = createBookingDto.notes?.trim();
    const noteHistory = initialNote
      ? prependBookingNoteHistory(
          null,
          formatBookingHistoryLine(new Date(), 'SEEKER', initialNote),
        )
      : null;

    return this.prisma.booking.create({
      data: {
        propertyId: createBookingDto.propertyId,
        seekerId: createBookingDto.seekerId,
        startTime: createBookingDto.startTime,
        endTime: createBookingDto.endTime,
        notes: createBookingDto.notes,
        noteHistory,
        status: BookingStatus.PENDING,
      },
    });
  }

  /**
   * Marks past PENDING/CONFIRMED bookings as LAPSED when read (lazy migration).
   * Documented choice: keep listings/dashboard reads consistent without a separate cron.
   */
  private async applyLazyLapse(rows: BookingRow[]): Promise<void> {
    const now = new Date();
    for (const b of rows) {
      if (
        b.endTime < now &&
        (b.status === BookingStatus.PENDING ||
          b.status === BookingStatus.CONFIRMED)
      ) {
        const line = formatBookingHistoryLine(
          new Date(),
          'SYSTEM',
          'Viewing window ended without a terminal outcome; status set to LAPSED.',
        );
        const merged = prependBookingNoteHistory(b.noteHistory, line);
        await this.prisma.booking.update({
          where: { id: b.id },
          data: {
            status: BookingStatus.LAPSED,
            noteHistory: merged,
          },
        });
        b.status = BookingStatus.LAPSED;
        b.noteHistory = merged;
      }
    }
  }

  async findAllByUser(userId: string, role: 'SEEKER' | 'OWNER') {
    const base = {
      include: {
        property: true,
        ...(role === 'OWNER'
          ? {
              seeker: {
                select: { firstName: true, lastName: true, email: true },
              },
            }
          : {}),
      },
      orderBy: { startTime: 'desc' as const },
    };

    const rows =
      role === 'SEEKER'
        ? await this.prisma.booking.findMany({
            where: { seekerId: userId },
            ...base,
          })
        : await this.prisma.booking.findMany({
            where: { property: { ownerId: userId } },
            ...base,
          });

    await this.applyLazyLapse(rows as BookingRow[]);
    return rows;
  }

  async updateBooking(
    id: string,
    userId: string,
    dto: {
      status?: BookingStatus;
      startTime?: string;
      endTime?: string;
      note: string;
    },
  ) {
    const hasStart = dto.startTime != null && dto.startTime !== '';
    const hasEnd = dto.endTime != null && dto.endTime !== '';
    if (hasStart !== hasEnd) {
      throw new BadRequestException(
        'startTime and endTime must both be provided for a reschedule',
      );
    }
    if (hasStart && dto.status !== undefined) {
      throw new BadRequestException(
        'Omit status when rescheduling; the booking is set back to PENDING',
      );
    }
    const hasWork = dto.status != null || hasStart;
    if (!hasWork) {
      throw new BadRequestException(
        'Provide status and/or startTime+endTime to update a booking',
      );
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    await this.applyLazyLapse([booking as BookingRow]);

    if (TERMINAL_STATUSES.includes(booking.status)) {
      throw new BadRequestException('This booking can no longer be changed');
    }

    const role = this.resolveRole(
      booking.seekerId,
      booking.property.ownerId,
      userId,
    );
    if (!role) {
      throw new ForbiddenException('You cannot modify this booking');
    }

    const noteText = dto.note.trim();
    const line = (r: BookingAuditRole, msg: string) =>
      prependBookingNoteHistory(
        booking.noteHistory,
        formatBookingHistoryLine(new Date(), r, msg),
      );

    const reschedule = hasStart && hasEnd;

    if (reschedule) {
      if (role !== 'SEEKER') {
        throw new ForbiddenException('Only the seeker can propose a new time');
      }
      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          'Can only reschedule pending or confirmed bookings',
        );
      }
      const start = new Date(dto.startTime!);
      const end = new Date(dto.endTime!);
      await this.availability.assertBookableWindow(
        booking.propertyId,
        start,
        end,
        booking.id,
      );

      return this.prisma.booking.update({
        where: { id },
        data: {
          startTime: start,
          endTime: end,
          status: BookingStatus.PENDING,
          noteHistory: line('SEEKER', `Rescheduled: ${noteText}`),
        },
        include: {
          property: true,
          seeker: { select: { firstName: true, lastName: true, email: true } },
        },
      });
    }

    if (dto.status === undefined || dto.status === null) {
      throw new BadRequestException('status is required unless rescheduling');
    }

    const next = dto.status;
    this.assertTransitionAllowed(role, booking.status, next);

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: next,
        noteHistory: line(
          role,
          this.transitionNote(role, booking.status, next, noteText),
        ),
      },
      include: {
        property: true,
        seeker: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  private transitionNote(
    role: BookingAuditRole,
    from: BookingStatus,
    to: BookingStatus,
    userNote: string,
  ): string {
    const action =
      to === BookingStatus.CONFIRMED
        ? 'Confirmed viewing'
        : to === BookingStatus.REJECTED
          ? 'Rejected request'
          : to === BookingStatus.CANCELLED
            ? 'Cancelled booking'
            : to === BookingStatus.COMPLETED
              ? 'Marked viewing completed'
              : `Changed status ${from} → ${to}`;
    return `${action}: ${userNote}`;
  }

  private resolveRole(
    seekerId: string,
    ownerId: string,
    userId: string,
  ): BookingAuditRole | null {
    if (seekerId === userId) return 'SEEKER';
    if (ownerId === userId) return 'OWNER';
    return null;
  }

  private assertTransitionAllowed(
    role: BookingAuditRole,
    current: BookingStatus,
    next: BookingStatus,
  ) {
    if (current === next) {
      throw new BadRequestException('Status is already set to that value');
    }

    if (role === 'OWNER') {
      if (current === BookingStatus.PENDING) {
        if (
          next !== BookingStatus.CONFIRMED &&
          next !== BookingStatus.REJECTED
        ) {
          throw new BadRequestException(
            'Owner can only confirm or reject a pending request (cannot cancel from pending)',
          );
        }
        return;
      }
      if (current === BookingStatus.CONFIRMED) {
        if (
          next !== BookingStatus.COMPLETED &&
          next !== BookingStatus.CANCELLED
        ) {
          throw new BadRequestException(
            'From CONFIRMED, the owner can mark the viewing completed or cancel the booking',
          );
        }
        return;
      }
    }

    if (role === 'SEEKER') {
      if (next === BookingStatus.COMPLETED) {
        if (current !== BookingStatus.CONFIRMED) {
          throw new BadRequestException(
            'Complete can only be set from a CONFIRMED booking after the viewing',
          );
        }
        return;
      }
      if (next === BookingStatus.CANCELLED) {
        if (
          current !== BookingStatus.PENDING &&
          current !== BookingStatus.CONFIRMED
        ) {
          throw new BadRequestException(
            'Can only cancel a pending or confirmed booking',
          );
        }
        return;
      }
      throw new BadRequestException('Invalid status change for seeker');
    }

    throw new BadRequestException('Invalid transition for your role');
  }
}
