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
}
