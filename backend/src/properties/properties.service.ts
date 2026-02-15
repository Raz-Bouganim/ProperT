import { Injectable } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyType, PropertyStatus } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) { }

  async create(createPropertyDto: CreatePropertyDto) {
    const { price, taxAnnual, hoaMonthly, ownerId, ...rest } = createPropertyDto;

    const availabilities = rest.availabilities?.map(a => ({
      ...a,
      date: a.date ? new Date(a.date) : undefined,
    }));

    const data: any = {
      ...rest,
      price: price.toString(),
      availabilities: availabilities ? { create: availabilities } : undefined,
      taxAnnual: taxAnnual?.toString(),
      hoaMonthly: hoaMonthly?.toString(),
      owner: { connect: { id: ownerId } }
    };

    return this.prisma.property.create({ data });
  }

  findAll(ownerId?: string) {
    const where = ownerId ? { ownerId } : {};
    return this.prisma.property.findMany({
      where,
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
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

    const rawProperties = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Listing"
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusInMeters}
      );
    `;

    const ids = rawProperties.map(p => p.id);

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
        where.status = filters.status as PropertyStatus;
      }
    }

    const [totalCount, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        include: { owner: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { properties, totalCount };
  }

  findOne(id: string) {
    return this.prisma.property.findUnique({
      where: { id },
      include: { owner: true, availabilities: true },
    });
  }

  update(id: string, updatePropertyDto: UpdatePropertyDto) {
    const { price, ...rest } = updatePropertyDto;
    const data: any = {
      ...rest,
      price: price ? price.toString() : undefined,
    };
    return this.prisma.property.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.property.delete({ where: { id } });
  }
}
