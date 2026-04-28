import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('properties/:propertyId/availability')
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) { }

    private parseDateOnly(dateString: string): Date {
        // Incoming format from frontend: yyyy-MM-dd (date-only)
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
        if (!m) throw new BadRequestException('Invalid date');
        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        const date = new Date(year, month - 1, day);
        if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');
        // Guard against JS Date overflow (e.g. 2026-02-31)
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            throw new BadRequestException('Invalid date');
        }
        return date;
    }

    @Post()
    async setAvailability(
        @Param('propertyId') propertyId: string,
        @Body() schedule: { dayOfWeek?: number; date?: string; startTime: string; endTime: string }[],
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
        const date = this.parseDateOnly(dateString);

        return this.availabilityService.getOpenSlots(propertyId, date);
    }
}
