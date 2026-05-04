import { PropertyStatus, User } from '@prisma/client';
import { formatLeaseDurationLabel } from './property-lease.util';

export type PublicOwner = Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;

function toPublicOwner(owner: User | null | undefined): PublicOwner | null {
  if (!owner) return null;
  return {
    id: owner.id,
    firstName: owner.firstName,
    lastName: owner.lastName,
    avatar: owner.avatar,
  };
}

function stripPropertyId<T extends { propertyId?: string }>(row: T): Omit<T, 'propertyId'> {
  const { propertyId: _p, ...rest } = row;
  return rest as Omit<T, 'propertyId'>;
}

/**
 * Public GET payloads: no owner email / Auth0 sub; omit redundant FKs on nested rows.
 * Adds convenience fields for clients (`leaseDurationLabel`, `coverImageUrl`).
 */
export function mapPropertyPublicResponse(property: any) {
  if (!property) return property;

  const leaseDurationMonths =
    property.leaseDurationMonths !== undefined && property.leaseDurationMonths !== null
      ? Number(property.leaseDurationMonths)
      : null;

  const leaseDurationLabel = formatLeaseDurationLabel(
    property.status as PropertyStatus,
    Number.isFinite(leaseDurationMonths as number) ? leaseDurationMonths : null,
  );

  const images = property.images as any[] | undefined;
  let coverImageUrl: string | null = null;
  if (images?.length) {
    const sorted = [...images].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
    coverImageUrl = sorted[0]?.url ?? null;
  }

  const mapped = {
    ...property,
    owner: toPublicOwner(property.owner),
    leaseDurationLabel,
    coverImageUrl,
    images: images?.map((img) => stripPropertyId(img)),
    availabilities: property.availabilities?.map((a: any) => stripPropertyId(a)),
    amenities: property.amenities?.map((a: any) => stripPropertyId(a)),
  };

  return mapped;
}
