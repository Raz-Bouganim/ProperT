import { Controller, Get, Post, Body, Patch, Param, Req, UseGuards, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingStatus } from '@prisma/client';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Assuming you have this
// import { CurrentUser } from '../auth/current-user.decorator'; // Assuming you have this

@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Post()
    create(@Body() createBookingDto: any) {
        // TODO: Get seekerId from JWT
        // For MVP/Demo: Assume seekerId is passed or hardcoded if auth not fully integrated in frontend yet
        // Parsing dates from string
        const data = {
            ...createBookingDto,
            startTime: new Date(createBookingDto.startTime),
            endTime: new Date(createBookingDto.endTime),
        };
        return this.bookingsService.create(data);
    }

    @Get('my-bookings')
    findAll(@Query('userId') userId: string, @Query('role') role: 'SEEKER' | 'OWNER') {
        // TODO: auth
        return this.bookingsService.findAllByUser(userId, role);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: BookingStatus,
        @Body('userId') userId: string, // Temporary: pass userId in body until Auth guard is active
    ) {
        return this.bookingsService.updateStatus(id, status, userId);
    }
}
