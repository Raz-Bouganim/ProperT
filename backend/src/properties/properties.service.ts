import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyType, PropertyStatus, AmenityType } from '@prisma/client';
import { assertCreatePropertyBusinessRules, assertDraftPropertyRules } from './property-business.validation';
import { parseLeaseDurationInput } from './property-lease.util';
import { publicUrlToObjectKey } from './property-image.util';
import { makeUniqueSlugCandidate, slugifyTitle } from './property-slug.util';
import { mapPropertyPublicResponse } from './property-public.mapper';

/** Form sends kebab-case ids from `frontend/.../constants/amenities.ts`; DB uses Prisma enum. */
const FRONTEND_FEATURE_TO_AMENITY: Record<string, AmenityType> = {
  'swimming-pool': AmenityType.SWIMMING_POOL,
  gym: AmenityType.GYM,
  parking: AmenityType.PARKING,
  garden: AmenityType.GARDEN,
  balcony: AmenityType.BALCONY,
  elevator: AmenityType.ELEVATOR,
  'air-conditioning': AmenityType.AIR_CONDITIONING,
  laundry: AmenityType.WASHER_DRYER,
  dishwasher: AmenityType.DISHWASHER,
};

function resolveAmenityTypes(features: string[] | undefined): AmenityType[] {
  if (!features?.length) return [];
  const allowed = new Set<string>(Object.values(AmenityType));
  const seen = new Set<AmenityType>();
  const out: AmenityType[] = [];
  for (const raw of features) {
    const value = allowed.has(raw)
      ? (raw as AmenityType)
      : FRONTEND_FEATURE_TO_AMENITY[raw];
    if (value !== undefined && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

function isLiveStatus(status: PropertyStatus | undefined | null) {
  return status === PropertyStatus.FOR_SALE || status === PropertyStatus.FOR_RENT;
}

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) { }

  private async allocateUniqueSlug(title: string): Promise<string> {
    const base = slugifyTitle(title);
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = attempt === 0 ? base : makeUniqueSlugCandidate(base);
      const clash = await this.prisma.property.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!clash) return candidate.slice(0, 200);
    }
    return makeUniqueSlugCandidate(base).slice(0, 200);
  }

  async create(createPropertyDto: CreatePropertyDto) {
    const {
      ownerId,
      availabilities,
      availableDate,
      leaseDuration,
      images,
      features,
      flowStartedAt,
    } = createPropertyDto;

    const status = createPropertyDto.status ?? PropertyStatus.DRAFT;
    const isDraft = status === PropertyStatus.DRAFT;

    if (isDraft) {
      assertDraftPropertyRules(createPropertyDto);
    } else {
      assertCreatePropertyBusinessRules(createPropertyDto);
    }

    if (!isDraft && (!images || images.length === 0)) {
      throw new BadRequestException('Published listings require at least one image');
    }

    const effectivePrice = isDraft
      ? Math.max(Number(createPropertyDto.price) || 0, 0.01)
      : createPropertyDto.price;
    const effectiveSqft = isDraft
      ? Math.max(Number(createPropertyDto.sqft) || 0, 1)
      : createPropertyDto.sqft;

    const amenityTypes = resolveAmenityTypes(features);
    const saleIntent = isDraft
      ? (createPropertyDto.draftTargetStatus ?? PropertyStatus.FOR_SALE) === PropertyStatus.FOR_SALE
      : status === PropertyStatus.FOR_SALE;
    const leaseMonths = saleIntent ? null : parseLeaseDurationInput(leaseDuration);

    const mappedAvailabilities = availabilities?.map(a => ({
      dayOfWeek: a.dayOfWeek ?? null,
      date: a.date ? new Date(a.date) : null,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

    const slug = await this.allocateUniqueSlug(createPropertyDto.title);
    const publishedAt = !isDraft && isLiveStatus(status) ? new Date() : null;

    const draftTargetStatus = isDraft
      ? (createPropertyDto.draftTargetStatus ?? PropertyStatus.FOR_SALE)
      : null;

    const row = await this.prisma.property.create({
      data: {
        slug,
        title: createPropertyDto.title,
        description: createPropertyDto.description,
        price: effectivePrice.toString(),
        sqft: effectiveSqft,
        negotiable: createPropertyDto.negotiable,
        bedrooms: createPropertyDto.bedrooms,
        bathrooms: createPropertyDto.bathrooms,
        type: createPropertyDto.type,
        status,
        draftTargetStatus,
        address: createPropertyDto.address,
        city: createPropertyDto.city,
        country: createPropertyDto.country,
        latitude: createPropertyDto.latitude,
        longitude: createPropertyDto.longitude,
        virtualTourUrl: createPropertyDto.virtualTourUrl,
        floorPlanUrl: createPropertyDto.floorPlanUrl,
        currency: createPropertyDto.currency,
        yearBuilt: createPropertyDto.yearBuilt,
        availableFrom:
          isDraft
            ? (availableDate ? new Date(availableDate) : undefined)
            : status === PropertyStatus.FOR_SALE
              ? null
              : availableDate
                ? new Date(availableDate)
                : undefined,
        leaseDurationMonths: saleIntent ? null : leaseMonths,
        flowStartedAt: flowStartedAt ? new Date(flowStartedAt) : undefined,
        publishedAt,
        availabilities:
          mappedAvailabilities && mappedAvailabilities.length > 0
            ? { create: mappedAvailabilities }
            : undefined,
        images: images && images.length > 0
          ? {
            create: images.map((url, index) => ({
              url,
              key: publicUrlToObjectKey(url),
              altText: 'Property image',
              isPrimary: index === 0,
              sortOrder: index,
            })),
          }
          : undefined,
        features: amenityTypes.length > 0
          ? { create: amenityTypes.map((feature) => ({ feature })) }
          : undefined,
        owner: { connect: { id: ownerId } },
      },
    });

    return this.findOne(row.id);
  }

  findAll(ownerId?: string) {
    const where = ownerId
      ? { ownerId, deletedAt: null }
      : {
        deletedAt: null,
        status: { in: [PropertyStatus.FOR_SALE, PropertyStatus.FOR_RENT] },
      };
    return this.prisma.property
      .findMany({
        where,
        include: { owner: true, images: true },
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) => rows.map(mapPropertyPublicResponse));
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
        location,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusInMeters}
      )
      AND deleted_at IS NULL;
    `;

    const ids = rawProperties.map(p => p.id);

    const where: any = {
      id: { in: ids },
      deletedAt: null,
      status: { in: [PropertyStatus.FOR_SALE, PropertyStatus.FOR_RENT] },
    };

    if (filters) {
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.price = {};
        if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
        if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
      }
      if (filters.beds !== undefined) where.bedrooms = { gte: filters.beds };
      if (filters.baths !== undefined) where.bathrooms = { gte: filters.baths };
      if (filters.propertyType) where.type = filters.propertyType as PropertyType;
      if (filters.status) where.status = filters.status as PropertyStatus;
    }

    const [totalCount, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        include: { owner: true, images: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      properties: properties.map(mapPropertyPublicResponse),
      totalCount,
    };
  }

  async findOne(idOrSlug: string) {
    const property = await this.prisma.property.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { owner: true, availabilities: true, images: true, features: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    return mapPropertyPublicResponse(property);
  }

  private async assertOwner(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.ownerId !== userId) throw new ForbiddenException('You can only modify your own listings');
  }

  async update(userId: string, id: string, updatePropertyDto: UpdatePropertyDto) {
    await this.assertOwner(userId, id);
    const existing = await this.prisma.property.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Property not found');

    const { price, availableDate, leaseDuration, status: nextStatus } = updatePropertyDto;

    if (nextStatus !== undefined && isLiveStatus(nextStatus)) {
      const imgCount = await this.prisma.propertyImage.count({ where: { propertyId: id } });
      if (imgCount === 0) {
        throw new BadRequestException('Add at least one image before publishing.');
      }
    }

    const mergedStatus = nextStatus ?? existing.status;

    let publishedAt: Date | undefined = undefined;
    if (nextStatus !== undefined && isLiveStatus(nextStatus) && !existing.publishedAt) {
      publishedAt = new Date();
    }

    const data: Record<string, unknown> = {
      ...(updatePropertyDto.title !== undefined && { title: updatePropertyDto.title }),
      ...(updatePropertyDto.description !== undefined && { description: updatePropertyDto.description }),
      ...(price !== undefined && { price: price.toString() }),
      ...(updatePropertyDto.sqft !== undefined && { sqft: updatePropertyDto.sqft }),
      ...(updatePropertyDto.negotiable !== undefined && { negotiable: updatePropertyDto.negotiable }),
      ...(updatePropertyDto.bedrooms !== undefined && { bedrooms: updatePropertyDto.bedrooms }),
      ...(updatePropertyDto.bathrooms !== undefined && { bathrooms: updatePropertyDto.bathrooms }),
      ...(updatePropertyDto.type !== undefined && { type: updatePropertyDto.type }),
      ...(nextStatus !== undefined && { status: nextStatus }),
      ...(updatePropertyDto.address !== undefined && { address: updatePropertyDto.address }),
      ...(updatePropertyDto.city !== undefined && { city: updatePropertyDto.city }),
      ...(updatePropertyDto.country !== undefined && { country: updatePropertyDto.country }),
      ...(updatePropertyDto.latitude !== undefined && { latitude: updatePropertyDto.latitude }),
      ...(updatePropertyDto.longitude !== undefined && { longitude: updatePropertyDto.longitude }),
      ...(updatePropertyDto.virtualTourUrl !== undefined && { virtualTourUrl: updatePropertyDto.virtualTourUrl }),
      ...(updatePropertyDto.floorPlanUrl !== undefined && { floorPlanUrl: updatePropertyDto.floorPlanUrl }),
      ...(updatePropertyDto.currency !== undefined && { currency: updatePropertyDto.currency }),
      ...(updatePropertyDto.yearBuilt !== undefined && { yearBuilt: updatePropertyDto.yearBuilt }),
      ...(publishedAt !== undefined && { publishedAt }),
    };

    if (nextStatus === PropertyStatus.FOR_SALE) {
      data.availableFrom = null;
      data.leaseDurationMonths = null;
    } else if (availableDate !== undefined) {
      data.availableFrom = availableDate ? new Date(availableDate) : null;
    }

    if (leaseDuration !== undefined || nextStatus !== undefined) {
      if (mergedStatus === PropertyStatus.FOR_SALE) {
        data.leaseDurationMonths = null;
      } else if (leaseDuration !== undefined) {
        data.leaseDurationMonths = parseLeaseDurationInput(leaseDuration);
      }
    }

    if (nextStatus !== undefined && isLiveStatus(nextStatus)) {
      data.draftTargetStatus = null;
      if (nextStatus === PropertyStatus.FOR_RENT) {
        const from =
          availableDate !== undefined
            ? (availableDate ? new Date(availableDate) : null)
            : existing.availableFrom;
        if (!from) {
          throw new BadRequestException('Rental listings require an available-from date before publishing');
        }
      }
    }

    await this.prisma.property.update({
      where: { id },
      data: data as any,
    });

    return this.findOne(id);
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    return this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
