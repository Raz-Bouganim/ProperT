import { BookingStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class PatchBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ValidateIf((o: PatchBookingDto) => !!(o.status ?? o.startTime ?? o.endTime))
  @IsString()
  @IsNotEmpty()
  note!: string;
}
