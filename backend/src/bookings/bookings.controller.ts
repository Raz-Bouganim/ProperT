import { Controller, Get, Post, Body, Patch, Param, Req, UseGuards, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/auth.guards';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Post()
    create(@Body() createBookingDto: any, @Req() req: any) {
        const data = {
            ...createBookingDto,
            seekerId: req.user.userId,
            startTime: new Date(createBookingDto.startTime),
            endTime: new Date(createBookingDto.endTime),
        };
        return this.bookingsService.create(data);
    }

    @Get('my-bookings')
    findAll(@Req() req: any, @Query('role') role: 'SEEKER' | 'OWNER') {
        return this.bookingsService.findAllByUser(req.user.userId, role);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: BookingStatus,
        @Req() req: any,
    ) {
        return this.bookingsService.updateStatus(id, status, req.user.userId);
    }
}
