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
  BadRequestException,
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
    @Query('minLat') minLat?: string,
    @Query('minLng') minLng?: string,
    @Query('maxLat') maxLat?: string,
    @Query('maxLng') maxLng?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('beds') beds?: string,
    @Query('baths') baths?: string,
    @Query('propertyType') propertyType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('minSqft') minSqft?: string,
    @Query('maxSqft') maxSqft?: string,
    @Query('maxLeaseDuration') maxLeaseDuration?: string,
    @Query('amenities') amenities?: string,
  ) {
    const minPriceNum = minPrice ? parseFloat(minPrice) : undefined;
    const maxPriceNum = maxPrice ? parseFloat(maxPrice) : undefined;
    const bedsNum = beds ? parseInt(beds, 10) : undefined;
    const bathsNum = baths ? parseInt(baths, 10) : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 9;
    const minSqftNum = minSqft ? parseFloat(minSqft) : undefined;
    const maxSqftNum = maxSqft ? parseFloat(maxSqft) : undefined;
    const maxLeaseDurationNum = maxLeaseDuration
      ? parseInt(maxLeaseDuration, 10)
      : undefined;
    const amenityList = amenities
      ? amenities.split(',').filter(Boolean)
      : undefined;

    if (minPriceNum !== undefined && !isFinite(minPriceNum))
      throw new BadRequestException('minPrice must be a number');
    if (maxPriceNum !== undefined && !isFinite(maxPriceNum))
      throw new BadRequestException('maxPrice must be a number');
    if (bedsNum !== undefined && !Number.isInteger(bedsNum))
      throw new BadRequestException('beds must be an integer');
    if (bathsNum !== undefined && !Number.isInteger(bathsNum))
      throw new BadRequestException('baths must be an integer');
    if (
      minPriceNum !== undefined &&
      maxPriceNum !== undefined &&
      minPriceNum > maxPriceNum
    )
      throw new BadRequestException('minPrice must be ≤ maxPrice');
    if (
      minSqftNum !== undefined &&
      maxSqftNum !== undefined &&
      minSqftNum > maxSqftNum
    )
      throw new BadRequestException('minSqft must be ≤ maxSqft');

    const sharedFilters = {
      minPrice: minPriceNum,
      maxPrice: maxPriceNum,
      beds: bedsNum,
      baths: bathsNum,
      propertyType,
      status,
      page: pageNum,
      limit: limitNum,
      sort,
      minSqft: minSqftNum,
      maxSqft: maxSqftNum,
      maxLeaseDuration: maxLeaseDurationNum,
      amenities: amenityList,
    };

    // Bounding-box search: GET /properties?minLat=...&minLng=...&maxLat=...&maxLng=...
    if (minLat && minLng && maxLat && maxLng) {
      const coords = [minLat, minLng, maxLat, maxLng].map(parseFloat);
      if (coords.some((c) => !isFinite(c)))
        throw new BadRequestException('Invalid bounding box coordinates');
      return this.propertiesService.findAllWithinBounds(
        coords[0],
        coords[1],
        coords[2],
        coords[3],
        sharedFilters,
      );
    }

    // Radius search: GET /properties?lat=...&lng=...&radius=...
    if (lat && lng && radius) {
      const latN = parseFloat(lat),
        lngN = parseFloat(lng),
        radiusN = parseFloat(radius);
      if (
        !isFinite(latN) ||
        !isFinite(lngN) ||
        !isFinite(radiusN) ||
        radiusN <= 0
      )
        throw new BadRequestException('Invalid lat/lng/radius');
      return this.propertiesService.findAllWithinRadius(
        latN,
        lngN,
        radiusN,
        sharedFilters,
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
  @Get('featured')
  findFeatured(
    @CurrentUser() user: JwtAuthUser | undefined,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const latN = lat ? parseFloat(lat) : undefined;
    const lngN = lng ? parseFloat(lng) : undefined;
    return this.propertiesService.findFeatured(
      user?.userId,
      latN !== undefined && isFinite(latN) ? latN : undefined,
      lngN !== undefined && isFinite(lngN) ? lngN : undefined,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtAuthUser | undefined,
    @Param('id') id: string,
  ) {
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
