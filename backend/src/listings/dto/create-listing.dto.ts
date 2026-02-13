import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType, ListingStatus } from '@prisma/client';

export class CreateAvailabilityDto {
    @IsNumber()
    @IsOptional()
    dayOfWeek?: number;

    @IsString()
    @IsOptional()
    date?: string;

    @IsString()
    startTime: string;

    @IsString()
    endTime: string;

}

export class CreateListingDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsNotEmpty()
    price: number;

    @IsNumber()
    @IsNotEmpty()
    sqft: number;

    @IsBoolean()
    @IsOptional()
    negotiable?: boolean;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    country: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    zipCode?: string;

    @IsString()
    @IsOptional()
    street?: string;

    @IsString()
    @IsOptional()
    houseNumber?: string;

    @IsEnum(PropertyType)
    @IsNotEmpty()
    type: PropertyType;

    @IsEnum(ListingStatus)
    @IsOptional()
    status?: ListingStatus;

    @IsNumber()
    @IsNotEmpty()
    bedrooms: number;

    @IsNumber()
    @IsNotEmpty()
    bathrooms: number;

    @IsString()
    @IsOptional()
    ownerId?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    latitude?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    longitude?: number;

    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsString({ each: true })
    @IsOptional()
    features?: string[];

    @IsString()
    @IsOptional()
    videoUrl?: string;

    @IsString()
    @IsOptional()
    virtualTourUrl?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    yearBuilt?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    taxAnnual?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    hoaMonthly?: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsOptional()
    availableDate?: string;

    @IsString()
    @IsOptional()
    leaseDuration?: string;

    @IsString()
    @IsOptional()
    floorPlanUrl?: string;

    @IsOptional()
    customFees?: any;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateAvailabilityDto)
    @IsOptional()
    availabilities?: CreateAvailabilityDto[];
}
