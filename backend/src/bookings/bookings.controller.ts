import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthUser } from '../auth/jwt-auth.types';
import { PatchBookingDto } from './dto/patch-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@CurrentUser() user: JwtAuthUser, @Body() createBookingDto: CreateBookingDto) {
    const data = {
      ...createBookingDto,
      seekerId: user.userId,
      startTime: new Date(createBookingDto.startTime),
      endTime: new Date(createBookingDto.endTime),
    };
    return this.bookingsService.create(data);
  }

  @Get('mine')
  findAll(@CurrentUser() user: JwtAuthUser, @Query('role') role: 'SEEKER' | 'OWNER') {
    return this.bookingsService.findAllByUser(user.userId, role);
  }

  @Patch(':id')
  patch(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @Body() dto: PatchBookingDto,
  ) {
    return this.bookingsService.updateBooking(id, user.userId, dto);
  }
}
