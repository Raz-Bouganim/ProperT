import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('listings/:listingId/availability')
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) { }

    @Post()
    async setAvailability(
        @Param('listingId') listingId: string,
        @Body() schedule: { dayOfWeek: number; startTime: string; endTime: string }[],
    ) {
        return this.availabilityService.setAvailability(listingId, schedule);
    }

    @Get()
    async getAvailability(@Param('listingId') listingId: string) {
        return this.availabilityService.getAvailability(listingId);
    }

    @Get('slots')
    async getOpenSlots(
        @Param('listingId') listingId: string,
        @Query('date') dateString: string,
    ) {
        if (!dateString) throw new BadRequestException('Date query param required');
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');

        return this.availabilityService.getOpenSlots(listingId, date);
    }
}
