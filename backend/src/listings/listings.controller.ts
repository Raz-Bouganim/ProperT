import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { JwtAuthGuard } from '../auth/auth.guards';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) { }

  @Post()
  create(@Body() createListingDto: CreateListingDto) {
    return this.listingsService.create(createListingDto);
  }

  @Get()
  findAll() {
    return this.listingsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-listings')
  findMyListings(@Request() req: any) {
    return this.listingsService.findAllByOwner(req.user.userId);
  }

  @Get('search')
  findAllWithinRadius(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('beds') beds?: string,
    @Query('baths') baths?: string,
    @Query('propertyType') propertyType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listingsService.findAllWithinRadius(
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateListingDto: UpdateListingDto) {
    return this.listingsService.update(id, updateListingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.listingsService.remove(id);
  }
}
