import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('properties/:propertyId/availability')
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) { }

    @Post()
    async setAvailability(
        @Param('propertyId') propertyId: string,
        @Body() schedule: { dayOfWeek: number; startTime: string; endTime: string }[],
    ) {
        return this.availabilityService.setAvailability(propertyId, schedule);
    }

    @Get()
    async getAvailability(@Param('propertyId') propertyId: string) {
        return this.availabilityService.getAvailability(propertyId);
    }

    @Get('slots')
    async getOpenSlots(
        @Param('propertyId') propertyId: string,
        @Query('date') dateString: string,
    ) {
        if (!dateString) throw new BadRequestException('Date query param required');
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');

        return this.availabilityService.getOpenSlots(propertyId, date);
    }
}
