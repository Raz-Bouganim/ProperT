/** Shared lightweight shape for catalog / map / cards (API may omit fields). */
export type PropertyImageRef = string | { url?: string };

export type PropertyListingPreview = {
  id: string;
  slug?: string;
  title?: string;
  addressLine?: string;
  address?: string;
  price?: number | string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  size?: number;
  coverImageUrl?: string | null;
  images?: PropertyImageRef[];
  status?: string;
  type?: string;
  currency?: string;
  leaseDuration?: string;
  leaseDurationLabel?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function coverImageUrl(
  listing: Pick<PropertyListingPreview, "coverImageUrl" | "images">,
  fallback: string,
): string {
  const first = listing.coverImageUrl ?? listing.images?.[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first && first.url) return first.url;
  return fallback;
}
