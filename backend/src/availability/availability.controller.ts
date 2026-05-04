import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('properties/:propertyId/availability')
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) { }

    /** yyyy-MM-dd calendar validation (local JS calendar); does not depend on property time zone. */
    private assertValidDateOnly(dateString: string): void {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
        if (!m) throw new BadRequestException('Invalid date');
        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        const date = new Date(year, month - 1, day);
        if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            throw new BadRequestException('Invalid date');
        }
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

    /** Slot start times as `HH:mm` strings in the listing's IANA `timeZone` (wall clock at the property). */
    @Get('slots')
    async getOpenSlots(
        @Param('propertyId') propertyId: string,
        @Query('date') dateString: string,
    ) {
        if (!dateString) throw new BadRequestException('Date query param required');
        this.assertValidDateOnly(dateString);

        return this.availabilityService.getOpenSlots(propertyId, dateString);
    }
}
