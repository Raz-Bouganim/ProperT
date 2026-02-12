import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType, ListingStatus } from '@prisma/client';

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
    size: number;

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
    @IsNotEmpty()
    ownerId: string;

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
    floorPlanUrl?: string;

    @IsOptional()
    customFees?: any;
}
