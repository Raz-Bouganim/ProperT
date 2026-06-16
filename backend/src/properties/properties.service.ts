/**
 * Property / listing lifecycle (service layer):
 * - `publishedAt === null` — draft; omitted from public catalog endpoints.
 * - `publishedAt` set and `status` in FOR_SALE | FOR_RENT — live listing.
 * - `status === CLOSED` — off-market (owner may still see the row in dashboard); excluded from public browse.
 * - `deletedAt` — soft-deleted / removed from normal UX; distinct from CLOSED.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3StorageAdapter } from '../media/s3-storage.adapter';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  Property,
  PropertyType,
  PropertyStatus,
  AmenityType,
  Prisma,
} from '@prisma/client';
import { parseLeaseDurationInput } from './property-lease.util';
import { PropertyAuthorizationService } from './property-authorization.service';
import { PropertyStrategyFactory } from './strategies/property-strategy.factory';
import { publicUrlToObjectKey } from './property-image.util';
import { makeUniqueSlugCandidate, slugifyTitle } from './property-slug.util';
import { mapPropertyPublicResponse } from './property-public.mapper';
import {
  PROPERTY_CARD_SELECT,
  PropertyCardDto,
  mapToPropertyCard,
} from './property-card.mapper';
import { CacheService } from '../redis/cache.service';
import { createHash } from 'crypto';

const ALL_CARDS_CACHE_KEY = 'properties:all_cards';
const ALL_CARDS_TTL = 300; // 5 minutes
const FEATURED_USER_CACHE_TTL = 300; // 5 minutes — per-user, per-location featured key
const SEARCH_TTL = 60; // 60 seconds

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_SLUG_ATTEMPTS = 12;

/** Form sends kebab-case ids from `frontend/.../constants/amenities.ts`; DB uses Prisma enum. */
const FRONTEND_FEATURE_TO_AMENITY: Record<string, AmenityType> = {
  'swimming-pool': AmenityType.SWIMMING_POOL,
  gym: AmenityType.GYM,
  parking: AmenityType.PARKING,
  garden: AmenityType.GARDEN,
  balcony: AmenityType.BALCONY,
  elevator: AmenityType.ELEVATOR,
  security: AmenityType.SECURITY,
  'air-conditioning': AmenityType.AIR_CONDITIONING,
  heating: AmenityType.HEATING,
  laundry: AmenityType.WASHER_DRYER,
  dishwasher: AmenityType.DISHWASHER,
  wifi: AmenityType.WIFI,
  fireplace: AmenityType.FIREPLACE,
  'pet-friendly': AmenityType.PET_FRIENDLY,
  furnished: AmenityType.FURNISHED,
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

function validatePropertyType(raw?: string): PropertyType | undefined {
  if (!raw) return undefined;
  if (!(Object.values(PropertyType) as string[]).includes(raw))
    throw new BadRequestException(`Invalid propertyType: ${raw}`);
  return raw as PropertyType;
}

function validatePropertyStatus(raw?: string): PropertyStatus | undefined {
  if (!raw) return undefined;
  if (!(Object.values(PropertyStatus) as string[]).includes(raw))
    throw new BadRequestException(`Invalid status: ${raw}`);
  return raw as PropertyStatus;
}

function isLiveMarketStatus(status: PropertyStatus | undefined | null) {
  return (
    status === PropertyStatus.FOR_SALE || status === PropertyStatus.FOR_RENT
  );
}

function publishCheckDtoFromRecord(
  existing: Property,
  patch: UpdatePropertyDto,
): CreatePropertyDto {
  const leaseDuration =
    patch.leaseDuration ??
    (existing.leaseDurationMonths != null
      ? `${existing.leaseDurationMonths} Months`
      : 'Flexible');

  return {
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description,
    price:
      patch.price !== undefined ? Number(patch.price) : Number(existing.price),
    sqft: patch.sqft !== undefined ? patch.sqft : existing.sqft,
    negotiable: patch.negotiable ?? existing.negotiable,
    addressLine: patch.addressLine ?? existing.addressLine,
    country: patch.country ?? existing.country,
    city: patch.city ?? existing.city,
    region: patch.region ?? existing.region ?? undefined,
    postalCode: patch.postalCode ?? existing.postalCode ?? undefined,
    timeZone: patch.timeZone ?? existing.timeZone,
    type: patch.type ?? existing.type,
    status: patch.status ?? existing.status,
    bedrooms:
      patch.bedrooms !== undefined
        ? patch.bedrooms
        : (existing.bedrooms ?? undefined),
    bathrooms:
      patch.bathrooms !== undefined
        ? patch.bathrooms
        : (existing.bathrooms ?? undefined),
    latitude: patch.latitude ?? existing.latitude ?? undefined,
    longitude: patch.longitude ?? existing.longitude ?? undefined,
    virtualTourUrl:
      patch.virtualTourUrl ?? existing.virtualTourUrl ?? undefined,
    floorPlanUrl: patch.floorPlanUrl ?? existing.floorPlanUrl ?? undefined,
    currency: patch.currency ?? existing.currency,
    yearBuilt: patch.yearBuilt ?? existing.yearBuilt ?? undefined,
    availableDate:
      patch.availableDate ??
      (existing.availableFrom
        ? existing.availableFrom.toISOString()
        : undefined),
    leaseDuration,
    amenities: patch.amenities,
    images: patch.images,
    availabilities: patch.availabilities,
    publish: true,
  };
}

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private prisma: PrismaService,
    private propertyAuthorization: PropertyAuthorizationService,
    private configService: ConfigService,
    private s3Adapter: S3StorageAdapter,
    private cache: CacheService,
  ) {}

  private buildSearchCacheKey(params: Record<string, unknown>): string {
    const normalized = Object.fromEntries(
      Object.keys(params)
        .sort()
        .map((k) => {
          const v = params[k];
          return [k, Array.isArray(v) ? [...(v as unknown[])].sort() : v];
        }),
    );
    const hash = createHash('sha1')
      .update(JSON.stringify(normalized))
      .digest('hex');
    return `properties:search:${hash}`;
  }

  private applySearchFilters(
    where: Prisma.PropertyWhereInput,
    filters: {
      minPrice?: number;
      maxPrice?: number;
      beds?: number;
      baths?: number;
      propertyType?: string;
      status?: string;
      minSqft?: number;
      maxSqft?: number;
      maxLeaseDuration?: number;
      amenities?: string[];
    },
  ): void {
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const price: Prisma.DecimalFilter = {};
      if (filters.minPrice !== undefined) price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) price.lte = filters.maxPrice;
      where.price = price;
    }
    if (filters.beds !== undefined) where.bedrooms = { gte: filters.beds };
    if (filters.baths !== undefined) where.bathrooms = { gte: filters.baths };
    const validType = validatePropertyType(filters.propertyType);
    if (validType !== undefined) where.type = validType;
    const validStatus = validatePropertyStatus(filters.status);
    if (validStatus !== undefined) where.status = validStatus;
    if (filters.minSqft !== undefined || filters.maxSqft !== undefined) {
      where.sqft = {};
      if (filters.minSqft !== undefined)
        (where.sqft as Prisma.FloatFilter).gte = filters.minSqft;
      if (filters.maxSqft !== undefined)
        (where.sqft as Prisma.FloatFilter).lte = filters.maxSqft;
    }
    if (filters.maxLeaseDuration !== undefined) {
      where.leaseDurationMonths = { lte: filters.maxLeaseDuration };
    }
    if (filters.amenities?.length) {
      where.AND = filters.amenities
        .filter((a) => (Object.values(AmenityType) as string[]).includes(a))
        .map((a) => ({ amenities: { some: { amenity: a as AmenityType } } }));
    }
  }

  /**
   * Verifies that every URL in `newUrls` has a valid, unexpired MediaUploadToken
   * owned by `userId`, then consumes those tokens so they cannot be replayed.
   * Throws BadRequestException if any URL is unauthorized.
   */
  private async validateAndConsumeImageTokens(
    userId: string,
    newUrls: string[],
  ): Promise<void> {
    if (newUrls.length === 0) return;
    const validTokens = await this.prisma.mediaUploadToken.findMany({
      where: {
        userId,
        publicUrl: { in: newUrls },
        expiresAt: { gt: new Date() },
      },
      select: { id: true, publicUrl: true },
    });
    const validUrlSet = new Set(validTokens.map((t) => t.publicUrl));
    const unauthorized = newUrls.filter((url) => !validUrlSet.has(url));
    if (unauthorized.length > 0) {
      throw new BadRequestException(
        'One or more images were not uploaded through the authorized upload flow.',
      );
    }
    await this.prisma.mediaUploadToken.deleteMany({
      where: { id: { in: validTokens.map((t) => t.id) } },
    });
  }

  private async invalidatePropertyCaches(): Promise<void> {
    await Promise.all([
      this.cache.del(ALL_CARDS_CACHE_KEY),
      this.cache.invalidatePattern('properties:featured:*'),
      this.cache.invalidatePattern('properties:search:*'),
    ]);
  }

  private async allocateUniqueSlug(title: string): Promise<string> {
    const base = slugifyTitle(title);
    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
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
    const { ownerId, availabilities, images, amenities } = createPropertyDto;

    const intent = createPropertyDto.status ?? PropertyStatus.FOR_SALE;
    if (
      intent !== PropertyStatus.FOR_SALE &&
      intent !== PropertyStatus.FOR_RENT
    ) {
      throw new BadRequestException('status must be FOR_SALE or FOR_RENT');
    }

    const strategy = PropertyStrategyFactory.for(
      createPropertyDto.type,
      intent,
    );
    const willPublish = createPropertyDto.publish === true;

    if (willPublish) {
      strategy.validatePublish(createPropertyDto);
      if (!images || images.length === 0) {
        throw new BadRequestException(
          'Published listings require at least one image',
        );
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

    const mappedAvailabilities = availabilities?.map((a) => ({
      dayOfWeek: a.dayOfWeek ?? null,
      date: a.date ? new Date(a.date) : null,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

    const slug = await this.allocateUniqueSlug(createPropertyDto.title);
    const publishedAt =
      willPublish && isLiveMarketStatus(intent) ? new Date() : null;
    const bucketName = this.configService.getOrThrow<string>('S3_BUCKET_NAME');

    const uniqueImages = [...new Set(images ?? [])];
    await this.validateAndConsumeImageTokens(
      createPropertyDto.ownerId!,
      uniqueImages,
    );

    const imageKeys = uniqueImages.map((url) =>
      publicUrlToObjectKey(url, bucketName),
    );

    try {
      const row = await this.prisma.property.create({
        data: {
          slug,
          title: createPropertyDto.title,
          description: createPropertyDto.description,
          price: effectivePrice.toString(),
          sqft: effectiveSqft,
          negotiable: createPropertyDto.negotiable,
          bedrooms:
            preparedBedrooms !== undefined
              ? preparedBedrooms
              : (createPropertyDto.bedrooms ?? null),
          bathrooms:
            preparedBathrooms !== undefined
              ? preparedBathrooms
              : (createPropertyDto.bathrooms ?? null),
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
          images:
            uniqueImages.length > 0
              ? {
                  create: uniqueImages.map((url, index) => ({
                    url,
                    key: publicUrlToObjectKey(url, bucketName),
                    altText: 'Property image',
                    isPrimary: index === 0,
                    sortOrder: index,
                  })),
                }
              : undefined,
          amenities:
            amenityTypes.length > 0
              ? { create: amenityTypes.map((amenity) => ({ amenity })) }
              : undefined,
          owner: { connect: { id: ownerId } },
        },
      });
      const created = await this.findOne(row.id, ownerId);
      await this.invalidatePropertyCaches();
      return created;
    } catch (dbError) {
      if (imageKeys.length > 0) {
        await Promise.allSettled(
          imageKeys.map((key) => this.s3Adapter.deleteObject(key)),
        );
      }
      throw dbError;
    }
  }

  async findFeatured(
    userId?: string,
    lat?: number,
    lng?: number,
  ): Promise<PropertyCardDto[]> {
    const cacheKey = `properties:featured:${userId ?? 'anon'}:${lat?.toFixed(2) ?? ''}:${lng?.toFixed(2) ?? ''}`;
    const cached = await this.cache.get<PropertyCardDto[]>(cacheKey);
    if (cached) return cached;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const publishedFilter = {
      deletedAt: null,
      publishedAt: { not: null },
      status: { in: [PropertyStatus.FOR_SALE, PropertyStatus.FOR_RENT] },
    };

    // 1. Fetch candidate pool (20 most recent) with an explicit select
    const candidates = await this.prisma.property.findMany({
      where: publishedFilter,
      select: {
        id: true,
        slug: true,
        ownerId: true,
        title: true,
        addressLine: true,
        latitude: true,
        longitude: true,
        price: true,
        currency: true,
        bedrooms: true,
        bathrooms: true,
        sqft: true,
        type: true,
        status: true,
        publishedAt: true,
        leaseDurationMonths: true,
        createdAt: true,
        images: {
          select: { url: true, isPrimary: true, sortOrder: true },
          orderBy: [
            { isPrimary: 'desc' as const },
            { sortOrder: 'asc' as const },
          ],
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (candidates.length === 0) return [];

    const ids = candidates.map((c) => c.id);

    // 2. Get weekly view counts + favorite counts in parallel
    const [viewGroups, favGroups, recentFavs] = await Promise.all([
      this.prisma.propertyView.groupBy({
        by: ['propertyId'],
        where: { propertyId: { in: ids }, viewedAt: { gte: sevenDaysAgo } },
        _count: { id: true },
      }),
      this.prisma.favorite.groupBy({
        by: ['propertyId'],
        where: { propertyId: { in: ids } },
        _count: { propertyId: true },
      }),
      // Infer rent/sale preference from signed-in user's last 10 favorites
      userId
        ? this.prisma.favorite.findMany({
            where: { userId },
            select: { property: { select: { status: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([] as { property: { status: PropertyStatus } }[]),
    ]);

    const weeklyViewMap = new Map(
      viewGroups.map((g) => [g.propertyId, g._count.id]),
    );
    const favMap = new Map(
      favGroups.map((g) => [g.propertyId, g._count.propertyId]),
    );

    let preferredStatus: PropertyStatus | null = null;
    if (userId && recentFavs.length > 0) {
      const rentCount = recentFavs.filter(
        (f) => f.property.status === PropertyStatus.FOR_RENT,
      ).length;
      const saleCount = recentFavs.filter(
        (f) => f.property.status === PropertyStatus.FOR_SALE,
      ).length;
      if (rentCount > saleCount) preferredStatus = PropertyStatus.FOR_RENT;
      else if (saleCount > rentCount) preferredStatus = PropertyStatus.FOR_SALE;
    }

    // 3. Score and pick top 3
    const scored = candidates.map((p) => {
      const weeklyViews = weeklyViewMap.get(p.id) ?? 0;
      const favCount = favMap.get(p.id) ?? 0;
      const ageInDays = (Date.now() - p.createdAt.getTime()) / 86_400_000;
      const recencyScore = 1 / (ageInDays + 2);
      const geoScore =
        lat != null && lng != null && p.latitude != null && p.longitude != null
          ? 1 / (haversineKm(lat, lng, p.latitude, p.longitude) + 1)
          : 1;
      const prefScore =
        preferredStatus != null && p.status === preferredStatus ? 1.5 : 1.0;
      const score =
        (weeklyViews + favCount * 2) * recencyScore * geoScore * prefScore;
      return { p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const result = scored.slice(0, 3).map(({ p }) => {
      const { createdAt: _c, ...rest } = p;
      return mapToPropertyCard(rest);
    });

    await this.cache.set(cacheKey, result, FEATURED_USER_CACHE_TTL);
    return result;
  }

  async findAll(ownerId?: string) {
    const base = { deletedAt: null };
    const where = ownerId
      ? { ...base, ownerId }
      : {
          ...base,
          publishedAt: { not: null },
          status: { in: [PropertyStatus.FOR_SALE, PropertyStatus.FOR_RENT] },
        };

    if (!ownerId) {
      const cached =
        await this.cache.get<PropertyCardDto[]>(ALL_CARDS_CACHE_KEY);
      if (cached) return cached;
    }

    const rows = await this.prisma.property.findMany({
      where,
      select: PROPERTY_CARD_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    const result = rows.map(mapToPropertyCard);

    if (!ownerId) {
      await this.cache.set(ALL_CARDS_CACHE_KEY, result, ALL_CARDS_TTL);
    }

    return result;
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
      sort?: string;
      minSqft?: number;
      maxSqft?: number;
      maxLeaseDuration?: number;
      amenities?: string[];
    },
  ) {
    const cacheKey = this.buildSearchCacheKey({
      lat,
      lng,
      radiusInKm,
      ...filters,
    });
    const cached = await this.cache.get<{
      properties: unknown[];
      totalCount: number;
    }>(cacheKey);
    if (cached) return cached;

    const radiusInMeters = radiusInKm * 1000;
    const page = filters?.page || 1;
    const limit = filters?.limit || 9;
    const skip = (page - 1) * limit;
    const orderBy =
      filters?.sort === 'price_asc'
        ? { price: 'asc' as const }
        : filters?.sort === 'price_desc'
          ? { price: 'desc' as const }
          : { createdAt: 'desc' as const };

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

    const ids = rawProperties.map((p) => p.id);

    const where: Prisma.PropertyWhereInput = {
      id: { in: ids },
      deletedAt: null,
      publishedAt: { not: null },
      status: { in: [PropertyStatus.FOR_SALE, PropertyStatus.FOR_RENT] },
    };

    if (filters) this.applySearchFilters(where, filters);

    const [totalCount, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        select: PROPERTY_CARD_SELECT,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    const result = {
      properties: properties.map(mapToPropertyCard),
      totalCount,
    };
    await this.cache.set(cacheKey, result, SEARCH_TTL);
    return result;
  }

  async findAllWithinBounds(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
    filters?: {
      minPrice?: number;
      maxPrice?: number;
      beds?: number;
      baths?: number;
      propertyType?: string;
      status?: string;
      page?: number;
      limit?: number;
      sort?: string;
      minSqft?: number;
      maxSqft?: number;
      maxLeaseDuration?: number;
      amenities?: string[];
    },
  ) {
    const cacheKey = this.buildSearchCacheKey({
      minLat,
      minLng,
      maxLat,
      maxLng,
      ...filters,
    });
    const cached = await this.cache.get<{
      properties: unknown[];
      totalCount: number;
    }>(cacheKey);
    if (cached) return cached;

    const page = filters?.page || 1;
    const limit = filters?.limit || 9;
    const skip = (page - 1) * limit;
    const orderBy =
      filters?.sort === 'price_asc'
        ? { price: 'asc' as const }
        : filters?.sort === 'price_desc'
          ? { price: 'desc' as const }
          : { createdAt: 'desc' as const };

    // && is the bounding-box overlap operator — hits the GiST index on location
    const rawProperties = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "properties"
      WHERE location::geometry && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
      AND deleted_at IS NULL
      AND published_at IS NOT NULL
      AND status IN ('FOR_SALE'::"PropertyStatus", 'FOR_RENT'::"PropertyStatus");
    `;

    const ids = rawProperties.map((p) => p.id);

    const where: Prisma.PropertyWhereInput = {
      id: { in: ids },
      deletedAt: null,
      publishedAt: { not: null },
      status: { in: [PropertyStatus.FOR_SALE, PropertyStatus.FOR_RENT] },
    };

    if (filters) this.applySearchFilters(where, filters);

    const [totalCount, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        select: PROPERTY_CARD_SELECT,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    const result = {
      properties: properties.map(mapToPropertyCard),
      totalCount,
    };
    await this.cache.set(cacheKey, result, SEARCH_TTL);
    return result;
  }

  async findAllPublished(filters?: {
    minPrice?: number;
    maxPrice?: number;
    beds?: number;
    baths?: number;
    propertyType?: string;
    status?: string;
    page?: number;
    limit?: number;
    sort?: string;
    minSqft?: number;
    maxSqft?: number;
    maxLeaseDuration?: number;
    amenities?: string[];
  }) {
    const cacheKey = this.buildSearchCacheKey({ scope: 'all', ...filters });
    const cached = await this.cache.get<{
      properties: unknown[];
      totalCount: number;
    }>(cacheKey);
    if (cached) return cached;

    const page = filters?.page || 1;
    const limit = filters?.limit || 9;
    const skip = (page - 1) * limit;
    const orderBy =
      filters?.sort === 'price_asc'
        ? { price: 'asc' as const }
        : filters?.sort === 'price_desc'
          ? { price: 'desc' as const }
          : { createdAt: 'desc' as const };

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      publishedAt: { not: null },
      status: { in: [PropertyStatus.FOR_SALE, PropertyStatus.FOR_RENT] },
    };

    if (filters) this.applySearchFilters(where, filters);

    const [totalCount, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        select: PROPERTY_CARD_SELECT,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    const result = {
      properties: properties.map(mapToPropertyCard),
      totalCount,
    };
    await this.cache.set(cacheKey, result, SEARCH_TTL);
    return result;
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
      include: {
        owner: true,
        availabilities: true,
        images: true,
        amenities: true,
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.publishedAt == null) {
      if (!requesterUserId || requesterUserId !== property.ownerId) {
        throw new NotFoundException('Property not found');
      }
    }
    // Track the view asynchronously — don't block the response
    this.trackView(property.id, requesterUserId ?? undefined);
    return mapPropertyPublicResponse(property);
  }

  private trackView(propertyId: string, userId?: string): void {
    Promise.all([
      this.prisma.property.update({
        where: { id: propertyId },
        data: { views: { increment: 1 } },
      }),
      this.prisma.propertyView.create({
        data: { propertyId, userId: userId ?? null },
      }),
    ]).catch((err: unknown) => {
      this.logger.warn(
        `Failed to track view for property ${propertyId}: ${String(err)}`,
      );
    });
  }

  async update(
    userId: string,
    id: string,
    updatePropertyDto: UpdatePropertyDto,
  ) {
    const existing = await this.propertyAuthorization.requireWritableProperty(
      userId,
      id,
    );

    const {
      price,
      availableDate,
      leaseDuration,
      status: nextStatus,
      publish: publishFlag,
    } = updatePropertyDto;

    const mergedStatus = nextStatus ?? existing.status;

    const needsImagesForLive =
      nextStatus !== undefined && isLiveMarketStatus(nextStatus);
    const needsImagesForFirstPublish =
      publishFlag === true && !existing.publishedAt;
    if (needsImagesForLive || needsImagesForFirstPublish) {
      const imageCount = await this.prisma.propertyImage.count({
        where: { propertyId: id },
      });
      if (imageCount === 0) {
        throw new BadRequestException(
          'Add at least one image before publishing.',
        );
      }
    }

    if (publishFlag === true && !existing.publishedAt) {
      const checkDto = publishCheckDtoFromRecord(existing, updatePropertyDto);
      const mergedType = updatePropertyDto.type ?? existing.type;
      PropertyStrategyFactory.for(mergedType, mergedStatus).validatePublish(
        checkDto,
      );
    }

    let publishedAt: Date | undefined = undefined;
    if (publishFlag === true && !existing.publishedAt) {
      publishedAt = new Date();
    } else if (
      nextStatus !== undefined &&
      isLiveMarketStatus(nextStatus) &&
      !existing.publishedAt
    ) {
      publishedAt = new Date();
    }

    const data: Record<string, unknown> = {
      ...(updatePropertyDto.title !== undefined && {
        title: updatePropertyDto.title,
      }),
      ...(updatePropertyDto.description !== undefined && {
        description: updatePropertyDto.description,
      }),
      ...(price !== undefined && { price: price.toString() }),
      ...(updatePropertyDto.sqft !== undefined && {
        sqft: updatePropertyDto.sqft,
      }),
      ...(updatePropertyDto.negotiable !== undefined && {
        negotiable: updatePropertyDto.negotiable,
      }),
      ...(updatePropertyDto.bedrooms !== undefined && {
        bedrooms: updatePropertyDto.bedrooms,
      }),
      ...(updatePropertyDto.bathrooms !== undefined && {
        bathrooms: updatePropertyDto.bathrooms,
      }),
      ...(updatePropertyDto.type !== undefined && {
        type: updatePropertyDto.type,
      }),
      ...(nextStatus !== undefined && { status: nextStatus }),
      ...(updatePropertyDto.addressLine !== undefined && {
        addressLine: updatePropertyDto.addressLine.trim(),
      }),
      ...(updatePropertyDto.city !== undefined && {
        city: updatePropertyDto.city,
      }),
      ...(updatePropertyDto.country !== undefined && {
        country: updatePropertyDto.country,
      }),
      ...(updatePropertyDto.region !== undefined && {
        region: updatePropertyDto.region?.trim() || null,
      }),
      ...(updatePropertyDto.postalCode !== undefined && {
        postalCode: updatePropertyDto.postalCode?.trim() || null,
      }),
      ...(updatePropertyDto.latitude !== undefined && {
        latitude: updatePropertyDto.latitude,
      }),
      ...(updatePropertyDto.longitude !== undefined && {
        longitude: updatePropertyDto.longitude,
      }),
      ...(updatePropertyDto.virtualTourUrl !== undefined && {
        virtualTourUrl: updatePropertyDto.virtualTourUrl,
      }),
      ...(updatePropertyDto.floorPlanUrl !== undefined && {
        floorPlanUrl: updatePropertyDto.floorPlanUrl,
      }),
      ...(updatePropertyDto.currency !== undefined && {
        currency: updatePropertyDto.currency,
      }),
      ...(updatePropertyDto.yearBuilt !== undefined && {
        yearBuilt: updatePropertyDto.yearBuilt,
      }),
      ...(updatePropertyDto.timeZone !== undefined && {
        timeZone: updatePropertyDto.timeZone.trim(),
      }),
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
            ? availableDate
              ? new Date(availableDate)
              : null
            : existing.availableFrom;
        if (!from) {
          throw new BadRequestException(
            'Rental listings require an available-from date before publishing',
          );
        }
      }
    }

    const updated = await this.prisma.property.updateMany({
      where: { id, ownerId: userId, deletedAt: null },
      data: data as Prisma.PropertyUpdateManyMutationInput,
    });
    if (updated.count !== 1) {
      throw new NotFoundException('Property not found');
    }

    if (updatePropertyDto.amenities !== undefined) {
      await this.prisma.propertyAmenity.deleteMany({
        where: { propertyId: id },
      });
      const types = resolveAmenityTypes(updatePropertyDto.amenities);
      if (types.length > 0) {
        await this.prisma.propertyAmenity.createMany({
          data: types.map((amenity) => ({ propertyId: id, amenity })),
        });
      }
    }

    if (updatePropertyDto.images !== undefined) {
      const bucketName =
        this.configService.getOrThrow<string>('S3_BUCKET_NAME');
      const submitted = [...new Set(updatePropertyDto.images)];

      const isCurrentlyLive =
        existing.publishedAt != null && isLiveMarketStatus(existing.status);
      if (isCurrentlyLive && submitted.length === 0) {
        throw new BadRequestException(
          'Published listings require at least one image',
        );
      }

      const currentImages = await this.prisma.propertyImage.findMany({
        where: { propertyId: id },
        select: { url: true, key: true },
      });

      const currentUrlSet = new Set(currentImages.map((img) => img.url));
      const newUrls = submitted.filter((url) => !currentUrlSet.has(url));
      await this.validateAndConsumeImageTokens(userId, newUrls);

      const submittedSet = new Set(submitted);
      const removedKeys = currentImages
        .filter((img) => !submittedSet.has(img.url))
        .map((img) => img.key);

      await this.prisma.$transaction([
        this.prisma.propertyImage.deleteMany({ where: { propertyId: id } }),
        this.prisma.propertyImage.createMany({
          data: submitted.map((url, index) => ({
            url,
            key: publicUrlToObjectKey(url, bucketName),
            altText: 'Property image',
            isPrimary: index === 0,
            sortOrder: index,
            propertyId: id,
          })),
        }),
      ]);

      if (removedKeys.length > 0) {
        const cleanupResults = await Promise.allSettled(
          removedKeys.map((key) => this.s3Adapter.deleteObject(key)),
        );
        cleanupResults.forEach((result, i) => {
          if (result.status === 'rejected') {
            this.logger.warn(
              `Failed to delete S3 object ${removedKeys[i]}: ${String(result.reason)}`,
            );
          }
        });
      }
    }

    const result = await this.findOne(id, userId);
    await this.invalidatePropertyCaches();
    return result;
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
      include: {
        owner: true,
        availabilities: true,
        images: true,
        amenities: true,
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    await this.invalidatePropertyCaches();
    return mapPropertyPublicResponse(property);
  }
}
