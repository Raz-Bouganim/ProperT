import { Injectable } from '@nestjs/common';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyType, ListingStatus } from '@prisma/client';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) { }

  create(createListingDto: CreateListingDto) {
    const { price, taxAnnual, hoaMonthly, ...rest } = createListingDto;
    const data: any = {
      ...rest,
      price: price.toString(),
      taxAnnual: taxAnnual?.toString(),
      hoaMonthly: hoaMonthly?.toString(),
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

  async findAllWithinRadius(
    lat: number,
    lng: number,
    radiusInKm: number,
    filters?: {
      minPrice?: number;
      maxPrice?: number;
      beds?: number;
      baths?: number;
      propertyType?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const radiusInMeters = radiusInKm * 1000;
    const page = filters?.page || 1;
    const limit = filters?.limit || 9;
    const skip = (page - 1) * limit;

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

    // 2. Build where clause for filters
    const where: any = { id: { in: ids } };

    if (filters) {
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.price = {};
        if (filters.minPrice !== undefined) {
          where.price.gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
          where.price.lte = filters.maxPrice;
        }
      }
      if (filters.beds !== undefined) {
        where.bedrooms = { gte: filters.beds };
      }
      if (filters.baths !== undefined) {
        where.bathrooms = { gte: filters.baths };
      }
      if (filters.propertyType) {
        where.type = filters.propertyType as PropertyType;
      }
      if (filters.status) {
        where.status = filters.status as ListingStatus;
      }
    }

    // 3. Fetch count and details with Prisma
    const [totalCount, listings] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        include: { owner: true } as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' } as any,
      }),
    ]);

    return { listings, totalCount };
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
