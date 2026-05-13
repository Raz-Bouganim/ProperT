/**
 * Property / listing lifecycle (service layer):
 * - `publishedAt === null` — draft; omitted from public catalog endpoints.
 * - `publishedAt` set and `status` in FOR_SALE | FOR_RENT — live listing.
 * - `status === CLOSED` — off-market (owner may still see the row in dashboard); excluded from public browse.
 * - `deletedAt` — soft-deleted / removed from normal UX; distinct from CLOSED.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Property, PropertyType, PropertyStatus, AmenityType } from '@prisma/client';
import { parseLeaseDurationInput } from './property-lease.util';
import { PropertyAuthorizationService } from './property-authorization.service';
import { PropertyStrategyFactory } from './strategies/property-strategy.factory';
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

function resolveAmenityTypes(raw: string[] | undefined): AmenityType[] {
  if (!raw?.length) return [];
  const allowed = new Set<string>(Object.values(AmenityType));
  const seen = new Set<AmenityType>();
  const out: AmenityType[] = [];
  for (const item of raw) {
    const value = allowed.has(item)
      ? (item as AmenityType)
      : FRONTEND_FEATURE_TO_AMENITY[item];
    if (value !== undefined && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

function isLiveMarketStatus(status: PropertyStatus | undefined | null) {
  return status === PropertyStatus.FOR_SALE || status === PropertyStatus.FOR_RENT;
}

function publishCheckDtoFromRecord(existing: Property, patch: UpdatePropertyDto): CreatePropertyDto {
  const leaseDuration =
    patch.leaseDuration ??
    (existing.leaseDurationMonths != null
      ? `${existing.leaseDurationMonths} Months`
      : 'Flexible');

  return {
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description,
    price: patch.price !== undefined ? Number(patch.price) : Number(existing.price),
    sqft: patch.sqft !== undefined ? patch.sqft : existing.sqft,
    negotiable: patch.negotiable ?? existing.negotiable,
    addressLine: patch.addressLine ?? existing.addressLine,
    country: patch.country ?? existing.country,
    city: patch.city ?? existing.city,
    region: patch.region ?? existing.region ?? undefined,
    postalCode: patch.postalCode ?? existing.postalCode ?? undefined,
    timeZone: patch.timeZone ?? existing.timeZone,
    type: (patch.type ?? existing.type) as PropertyType,
    status: (patch.status ?? existing.status) as PropertyStatus,
    bedrooms: patch.bedrooms !== undefined ? patch.bedrooms : (existing.bedrooms ?? undefined),
    bathrooms: patch.bathrooms !== undefined ? patch.bathrooms : (existing.bathrooms ?? undefined),
    latitude: patch.latitude ?? existing.latitude ?? undefined,
    longitude: patch.longitude ?? existing.longitude ?? undefined,
    virtualTourUrl: patch.virtualTourUrl ?? existing.virtualTourUrl ?? undefined,
    floorPlanUrl: patch.floorPlanUrl ?? existing.floorPlanUrl ?? undefined,
    currency: patch.currency ?? existing.currency,
    yearBuilt: patch.yearBuilt ?? existing.yearBuilt ?? undefined,
    availableDate:
      patch.availableDate ??
      (existing.availableFrom ? existing.availableFrom.toISOString() : undefined),
    leaseDuration,
    amenities: patch.amenities,
    images: patch.images,
    availabilities: patch.availabilities,
    publish: true,
  };
}

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private propertyAuthorization: PropertyAuthorizationService,
  ) {}

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
      images,
      amenities,
    } = createPropertyDto;

    const intent = createPropertyDto.status ?? PropertyStatus.FOR_SALE;
    if (intent !== PropertyStatus.FOR_SALE && intent !== PropertyStatus.FOR_RENT) {
      throw new BadRequestException('status must be FOR_SALE or FOR_RENT');
    }

    const strategy = PropertyStrategyFactory.for(createPropertyDto.type, intent);
    const willPublish = createPropertyDto.publish === true;

    if (willPublish) {
      strategy.validatePublish(createPropertyDto);
      if (!images || images.length === 0) {
        throw new BadRequestException('Published listings require at least one image');
      }
    } else {
      strategy.validateDraft(createPropertyDto);
    }

    const effectivePrice = willPublish
      ? createPropertyDto.price
      : Math.max(Number(createPropertyDto.price) || 0, 0.01);
    const effectiveSqft = willPublish
      ? createPropertyDto.sqft
      : Math.max(Number(createPropertyDto.sqft) || 0, 1);

    const amenityTypes = resolveAmenityTypes(amenities);
    const {
      leaseMonths,
      availableFrom: preparedAvailableFrom,
      bedrooms: preparedBedrooms,
      bathrooms: preparedBathrooms,
    } = strategy.prepareData(createPropertyDto, willPublish);

    const mappedAvailabilities = availabilities?.map(a => ({
      dayOfWeek: a.dayOfWeek ?? null,
      date: a.date ? new Date(a.date) : null,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

    const slug = await this.allocateUniqueSlug(createPropertyDto.title);
    const publishedAt = willPublish && isLiveMarketStatus(intent) ? new Date() : null;

    const row = await this.prisma.property.create({
      data: {
        slug,
        title: createPropertyDto.title,
        description: createPropertyDto.description,
        price: effectivePrice.toString(),
        sqft: effectiveSqft,
        negotiable: createPropertyDto.negotiable,
        bedrooms: preparedBedrooms !== undefined ? preparedBedrooms : (createPropertyDto.bedrooms ?? null),
        bathrooms: preparedBathrooms !== undefined ? preparedBathrooms : (createPropertyDto.bathrooms ?? null),
        type: createPropertyDto.type,
        status: intent,
        addressLine: createPropertyDto.addressLine.trim(),
        city: createPropertyDto.city,
        country: createPropertyDto.country,
        region: createPropertyDto.region?.trim() || null,
        postalCode: createPropertyDto.postalCode?.trim() || null,
        latitude: createPropertyDto.latitude,
        longitude: createPropertyDto.longitude,
        virtualTourUrl: createPropertyDto.virtualTourUrl,
        floorPlanUrl: createPropertyDto.floorPlanUrl,
        currency: createPropertyDto.currency,
        yearBuilt: createPropertyDto.yearBuilt,
        timeZone: createPropertyDto.timeZone?.trim() || undefined,
        availableFrom: preparedAvailableFrom,
        leaseDurationMonths: leaseMonths,
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
        amenities: amenityTypes.length > 0
          ? { create: amenityTypes.map((amenity) => ({ amenity })) }
          : undefined,
        owner: { connect: { id: ownerId } },
      },
    });

    return this.findOne(row.id, ownerId);
  }

  findAll(ownerId?: string) {
    const base = { deletedAt: null };
    const where = ownerId
      ? { ...base, ownerId }
      : {
        ...base,
        publishedAt: { not: null },
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
      SELECT id FROM "properties"
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusInMeters}
      )
      AND deleted_at IS NULL
      AND published_at IS NOT NULL
      AND status IN ('FOR_SALE'::"PropertyStatus", 'FOR_RENT'::"PropertyStatus");
    `;

    const ids = rawProperties.map(p => p.id);

    const where: Record<string, unknown> = {
      id: { in: ids },
      deletedAt: null,
      publishedAt: { not: null },
      status: { in: [PropertyStatus.FOR_SALE, PropertyStatus.FOR_RENT] },
    };

    if (filters) {
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const price: Record<string, number> = {};
        if (filters.minPrice !== undefined) price.gte = filters.minPrice;
        if (filters.maxPrice !== undefined) price.lte = filters.maxPrice;
        where.price = price;
      }
      if (filters.beds !== undefined) where.bedrooms = { gte: filters.beds };
      if (filters.baths !== undefined) where.bathrooms = { gte: filters.baths };
      if (filters.propertyType) where.type = filters.propertyType as PropertyType;
      if (filters.status) where.status = filters.status as PropertyStatus;
    }

    const [totalCount, properties] = await Promise.all([
      this.prisma.property.count({ where: where as any }),
      this.prisma.property.findMany({
        where: where as any,
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

  /**
   * Public catalog surfaces only published rows elsewhere; this endpoint must hide drafts
   * unless `requesterUserId` matches `ownerId` (owner preview after save-as-draft).
   */
  async findOne(idOrSlug: string, requesterUserId?: string | null) {
    const property = await this.prisma.property.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { owner: true, availabilities: true, images: true, amenities: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.publishedAt == null) {
      if (!requesterUserId || requesterUserId !== property.ownerId) {
        throw new NotFoundException('Property not found');
      }
    }
    return mapPropertyPublicResponse(property);
  }

  async update(userId: string, id: string, updatePropertyDto: UpdatePropertyDto) {
    const existing = await this.propertyAuthorization.requireWritableProperty(userId, id);

    const {
      price,
      availableDate,
      leaseDuration,
      status: nextStatus,
      publish: publishFlag,
    } = updatePropertyDto;

    const mergedStatus = (nextStatus ?? existing.status) as PropertyStatus;

    const needsImagesForLive = nextStatus !== undefined && isLiveMarketStatus(nextStatus);
    const needsImagesForFirstPublish = publishFlag === true && !existing.publishedAt;
    if (needsImagesForLive || needsImagesForFirstPublish) {
      const imageCount = await this.prisma.propertyImage.count({ where: { propertyId: id } });
      if (imageCount === 0) {
        throw new BadRequestException('Add at least one image before publishing.');
      }
    }

    if (publishFlag === true && !existing.publishedAt) {
      const checkDto = publishCheckDtoFromRecord(existing, updatePropertyDto);
      const mergedType = (updatePropertyDto.type ?? existing.type) as PropertyType;
      PropertyStrategyFactory.for(mergedType, mergedStatus).validatePublish(checkDto);
    }

    let publishedAt: Date | undefined = undefined;
    if (publishFlag === true && !existing.publishedAt) {
      publishedAt = new Date();
    } else if (nextStatus !== undefined && isLiveMarketStatus(nextStatus) && !existing.publishedAt) {
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
      ...(updatePropertyDto.addressLine !== undefined && { addressLine: updatePropertyDto.addressLine.trim() }),
      ...(updatePropertyDto.city !== undefined && { city: updatePropertyDto.city }),
      ...(updatePropertyDto.country !== undefined && { country: updatePropertyDto.country }),
      ...(updatePropertyDto.region !== undefined && { region: updatePropertyDto.region?.trim() || null }),
      ...(updatePropertyDto.postalCode !== undefined && { postalCode: updatePropertyDto.postalCode?.trim() || null }),
      ...(updatePropertyDto.latitude !== undefined && { latitude: updatePropertyDto.latitude }),
      ...(updatePropertyDto.longitude !== undefined && { longitude: updatePropertyDto.longitude }),
      ...(updatePropertyDto.virtualTourUrl !== undefined && { virtualTourUrl: updatePropertyDto.virtualTourUrl }),
      ...(updatePropertyDto.floorPlanUrl !== undefined && { floorPlanUrl: updatePropertyDto.floorPlanUrl }),
      ...(updatePropertyDto.currency !== undefined && { currency: updatePropertyDto.currency }),
      ...(updatePropertyDto.yearBuilt !== undefined && { yearBuilt: updatePropertyDto.yearBuilt }),
      ...(updatePropertyDto.timeZone !== undefined && { timeZone: updatePropertyDto.timeZone.trim() }),
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

    if (nextStatus !== undefined && isLiveMarketStatus(nextStatus)) {
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

    const updated = await this.prisma.property.updateMany({
      where: { id, ownerId: userId, deletedAt: null },
      data: data as any,
    });
    if (updated.count !== 1) {
      throw new NotFoundException('Property not found');
    }

    if (updatePropertyDto.amenities !== undefined) {
      await this.prisma.propertyAmenity.deleteMany({ where: { propertyId: id } });
      const types = resolveAmenityTypes(updatePropertyDto.amenities);
      if (types.length > 0) {
        await this.prisma.propertyAmenity.createMany({
          data: types.map((amenity) => ({ propertyId: id, amenity })),
        });
      }
    }

    return this.findOne(id, userId);
  }

  async remove(userId: string, id: string) {
    const deleted = await this.prisma.property.updateMany({
      where: { id, ownerId: userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (deleted.count !== 1) {
      throw new NotFoundException('Property not found');
    }
    const property = await this.prisma.property.findFirst({
      where: { id, ownerId: userId },
      include: { owner: true, availabilities: true, images: true, amenities: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return mapPropertyPublicResponse(property);
  }
}
