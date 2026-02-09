import { PropertyType } from '../entities/listing.entity';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
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
}
