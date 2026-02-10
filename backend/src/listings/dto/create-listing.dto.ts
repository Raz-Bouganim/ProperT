import { PropertyType } from '../entities/listing.entity';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateListingDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    price: number;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    size: number;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsEnum(PropertyType)
    type: PropertyType;

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
}
