import { Injectable } from '@nestjs/common';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyType } from './entities/listing.entity';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) { }

  create(createListingDto: CreateListingDto) {
    const data: any = {
      ...createListingDto,
      price: createListingDto.price.toString(),
    };
    return this.prisma.listing.create({ data });
  }

  findAll() {
    return this.prisma.listing.findMany({
      include: { owner: true } as any,
      orderBy: { createdAt: 'desc' } as any,
    });
  }

  findAllByOwner(ownerId: string) {
    return this.prisma.listing.findMany({
      where: { ownerId },
      include: { owner: true } as any,
      orderBy: { createdAt: 'desc' } as any,
    });
  }

  async findAllWithinRadius(lat: number, lng: number, radiusInKm: number) {
    const radiusInMeters = radiusInKm * 1000;

    // 1. Find IDs within radius using PostGIS
    const rawListings = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Listing"
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusInMeters}
      );
    `;

    const ids = rawListings.map(l => l.id);

    // 2. Fetch full details with Prisma
    return this.prisma.listing.findMany({
      where: { id: { in: ids } },
      include: { owner: true } as any,
    });
  }

  findOne(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: { owner: true, availabilities: true } as any,
    });
  }

  update(id: string, updateListingDto: UpdateListingDto) {
    const { price, ...rest } = updateListingDto;
    const data: any = {
      ...rest,
      price: price ? price.toString() : undefined,
    };
    return this.prisma.listing.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.listing.delete({ where: { id } });
  }
}
