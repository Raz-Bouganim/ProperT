import {
  Property,
  PropertyAvailability,
  PropertyAmenity,
  PropertyImage,
  User,
} from '@prisma/client';
import { formatLeaseDurationLabel } from './property-lease.util';

export type PublicOwner = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'avatar'
>;

function toPublicOwner(owner: User | null | undefined): PublicOwner | null {
  if (!owner) return null;
  return {
    id: owner.id,
    firstName: owner.firstName,
    lastName: owner.lastName,
    avatar: owner.avatar,
  };
}

/** Row shape accepted by `mapPropertyPublicResponse` (Prisma `include` variants). */
export type PropertyRowForPublicMap = Property & {
  owner?: User | null;
  images?: PropertyImage[];
  availabilities?: PropertyAvailability[];
  amenities?: PropertyAmenity[];
};

export type MappedPublicProperty = Omit<
  PropertyRowForPublicMap,
  'owner' | 'images' | 'availabilities' | 'amenities'
> & {
  owner: PublicOwner | null;
  images: Array<Omit<PropertyImage, 'propertyId'>> | undefined;
  availabilities: Array<Omit<PropertyAvailability, 'propertyId'>> | undefined;
  amenities: Array<Omit<PropertyAmenity, 'propertyId'>> | undefined;
  leaseDurationLabel: string | null;
  coverImageUrl: string | null;
};

function stripPropertyId<T extends { propertyId: string }>(
  row: T,
): Omit<T, 'propertyId'> {
  const { propertyId, ...rest } = row;
  void propertyId;
  return rest;
}

/**
 * Public GET payloads: no owner email / Auth0 sub; omit redundant FKs on nested rows.
 * Adds convenience fields for clients (`leaseDurationLabel`, `coverImageUrl`).
 */
export function mapPropertyPublicResponse(
  property: PropertyRowForPublicMap | null | undefined,
): MappedPublicProperty | null | undefined {
  if (!property) return property ?? undefined;

  const leaseDurationMonths =
    property.leaseDurationMonths !== undefined &&
    property.leaseDurationMonths !== null
      ? Number(property.leaseDurationMonths)
      : null;

  const leaseDurationLabel = formatLeaseDurationLabel(
    property.status,
    Number.isFinite(leaseDurationMonths) ? leaseDurationMonths : null,
  );

  const images = property.images;
  let coverImageUrl: string | null = null;
  if (images?.length) {
    const sorted = [...images].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
    coverImageUrl = sorted[0]?.url ?? null;
  }

  const mapped: MappedPublicProperty = {
    ...property,
    owner: toPublicOwner(property.owner ?? null),
    leaseDurationLabel,
    coverImageUrl,
    images: images?.map((img) => stripPropertyId(img)),
    availabilities: property.availabilities?.map((a) => stripPropertyId(a)),
    amenities: property.amenities?.map((a) => stripPropertyId(a)),
  };

  return mapped;
}
