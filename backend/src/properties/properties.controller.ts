import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/auth.guards';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() createPropertyDto: CreatePropertyDto) {
    if (!req.user || !req.user.userId) {
      throw new Error("User ID missing in request");
    }
    createPropertyDto.ownerId = req.user.userId;
    return this.propertiesService.create(createPropertyDto);
  }

  @Get()
  findAll(
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
    @Request() req?: any,
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
        }
      );
    }

    // Owner filter: GET /properties?owner=me
    if (owner === 'me' && req?.user?.userId) {
      return this.propertiesService.findAll(req.user.userId);
    }

    return this.propertiesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Request() req: any) {
    return this.propertiesService.findAll(req.user.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Request() req: { user?: { userId: string } }, @Param('id') id: string) {
    return this.propertiesService.findOne(id, req.user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() updatePropertyDto: UpdatePropertyDto) {
    return this.propertiesService.update(req.user.userId, id, updatePropertyDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.propertiesService.remove(req.user.userId, id);
  }
}
