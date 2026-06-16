import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsIn,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType, PropertyStatus } from '@prisma/client';
import { IsIanaTimeZone } from '../validators/is-iana-timezone.decorator';

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

/**
 * Create property payload.
 * - `publish === true`: live listing — strict validation, `publishedAt` set server-side.
 * - `publish !== true`: draft — `publishedAt` null; `status` is intent (FOR_SALE | FOR_RENT only).
 * - `price`: sale = listing price; rent = monthly rent (same field).
 */
export class CreatePropertyDto {
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

  /** Street / single-line address (required). */
  @IsString()
  @IsNotEmpty()
  addressLine: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  /**
   * IANA time zone for the listing. Interprets weekly `dayOfWeek` and `startTime`/`endTime` on
   * availability rules. Default at rest is `UTC` when omitted (see Prisma schema).
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIanaTimeZone()
  timeZone?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsEnum(PropertyType)
  @IsNotEmpty()
  type: PropertyType;

  /** Sale vs rent intent. Never CLOSED on create. */
  @IsOptional()
  @IsIn([PropertyStatus.FOR_SALE, PropertyStatus.FOR_RENT])
  status?: PropertyStatus;

  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  bathrooms?: number;

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

  /** Amenity ids from the UI (kebab-case or Prisma enum strings). */
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
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

  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @IsOptional()
  floorPlanUrl?: string;

  @IsOptional()
  customFees?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  @IsOptional()
  availabilities?: CreateAvailabilityDto[];

  /** When true, validate and publish; when false/omitted, save as draft (`publishedAt` null). */
  @IsBoolean()
  @IsOptional()
  publish?: boolean;
}
