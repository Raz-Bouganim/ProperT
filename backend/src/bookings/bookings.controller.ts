import { Controller, Get, Post, Body, Patch, Param, Req, UseGuards, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/auth.guards';
import { PatchBookingDto } from './dto/patch-booking.dto';

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

    @Get('mine')
    findAll(@Req() req: any, @Query('role') role: 'SEEKER' | 'OWNER') {
        return this.bookingsService.findAllByUser(req.user.userId, role);
    }

    @Patch(':id')
    patch(@Param('id') id: string, @Body() dto: PatchBookingDto, @Req() req: any) {
        return this.bookingsService.updateBooking(id, req.user.userId, dto);
    }
}
