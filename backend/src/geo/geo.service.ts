import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeoService {
    constructor(private readonly httpService: HttpService) { }

    private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    private readonly userAgent = 'ProperTNestJS/1.0 (contact@propert.com)';

    async search(query: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.nominatimBaseUrl}/search`, {
                    params: {
                        format: 'json',
                        q: query,
                        addressdetails: 1,
                        limit: 1,
                    },
                    headers: {
                        'User-Agent': this.userAgent,
                    },
                }),
            );
            return response.data;
        } catch (error) {
            console.error('Geo search failed', error);
            throw new InternalServerErrorException('Failed to fetch geocoding data');
        }
    }

    async reverse(lat: number, lon: number) {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.nominatimBaseUrl}/reverse`, {
                    params: {
                        format: 'json',
                        lat,
                        lon,
                        addressdetails: 1,
                    },
                    headers: {
                        'User-Agent': this.userAgent,
                    },
                }),
            );
            return response.data;
        } catch (error) {
            console.error('Geo reverse failed', error);
            throw new InternalServerErrorException('Failed to fetch reverse geocoding data');
        }
    }
}
