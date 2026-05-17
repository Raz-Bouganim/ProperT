import { Controller, Get, Post, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthUser } from '../auth/jwt-auth.types';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':propertyId')
  toggle(
    @CurrentUser() user: JwtAuthUser,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.favoritesService.toggle(user.userId, propertyId);
  }

  @Get()
  findAll(@CurrentUser() user: JwtAuthUser) {
    return this.favoritesService.findAll(user.userId);
  }
}
