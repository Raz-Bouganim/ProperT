import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthUser } from '../auth/jwt-auth.types';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: JwtAuthUser,
    @Body() createPropertyDto: CreatePropertyDto,
  ) {
    createPropertyDto.ownerId = user.userId;
    return this.propertiesService.create(createPropertyDto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(
    @CurrentUser() user: JwtAuthUser | undefined,
    @Query('owner') owner?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('beds') beds?: string,
    @Query('baths') baths?: string,
    @Query('propertyType') propertyType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Geo search: GET /properties?lat=...&lng=...&radius=...
    if (lat && lng && radius) {
      return this.propertiesService.findAllWithinRadius(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius),
        {
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          beds: beds ? parseInt(beds) : undefined,
          baths: baths ? parseInt(baths) : undefined,
          propertyType,
          status,
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 9,
        },
      );
    }

    // Owner filter: GET /properties?owner=me
    if (owner === 'me') {
      if (!user?.userId) {
        throw new UnauthorizedException();
      }
      return this.propertiesService.findAll(user.userId);
    }

    return this.propertiesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@CurrentUser() user: JwtAuthUser) {
    return this.propertiesService.findAll(user.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() user: JwtAuthUser | undefined, @Param('id') id: string) {
    return this.propertiesService.findOne(id, user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(user.userId, id, updatePropertyDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.propertiesService.remove(user.userId, id);
  }
}
