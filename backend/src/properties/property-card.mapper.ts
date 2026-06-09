import { Prisma } from '@prisma/client';
import { formatLeaseDurationLabel } from './property-lease.util';

export type PropertyCardDto = Omit<
  CardRow,
  'leaseDurationMonths' | 'images'
> & {
  coverImageUrl: string | null;
  leaseDurationLabel: string | null;
};

export const PROPERTY_CARD_SELECT = {
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
  images: {
    select: { url: true, isPrimary: true, sortOrder: true },
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
    take: 1,
  },
} satisfies Prisma.PropertySelect;

type CardRow = Prisma.PropertyGetPayload<{
  select: typeof PROPERTY_CARD_SELECT;
}>;

export function mapToPropertyCard(row: CardRow): PropertyCardDto {
  const coverImageUrl = row.images[0]?.url ?? null;
  const leaseDurationLabel = formatLeaseDurationLabel(
    row.status,
    row.leaseDurationMonths,
  );
  const { leaseDurationMonths: _omit, images: _imgs, ...rest } = row;
  return { ...rest, coverImageUrl, leaseDurationLabel };
}
