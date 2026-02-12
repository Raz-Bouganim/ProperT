import { Controller, Get, Query } from '@nestjs/common';
import { GeoService } from './geo.service';

@Controller('geo')
export class GeoController {
    constructor(private readonly geoService: GeoService) { }

    @Get('search')
    search(@Query('q') query: string) {
        return this.geoService.search(query);
    }

    @Get('reverse')
    reverse(@Query('lat') lat: string, @Query('lon') lon: string) {
        return this.geoService.reverse(parseFloat(lat), parseFloat(lon));
    }
}
