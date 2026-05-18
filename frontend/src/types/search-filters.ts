export type SearchFilterPatch = Partial<{
  minPrice: number | string | null;
  maxPrice: number | string | null;
  beds: number | string | null;
  baths: number | string | null;
  propertyType: string | null;
  status: string | null;
  minSqft: number | string | null;
  maxSqft: number | string | null;
  maxLeaseDuration: number | string | null;
  amenities: string[] | null;
}>;

export type SearchFilterInitial = Partial<{
  status: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  beds: string | null;
  baths: string | null;
  propertyType: string | null;
  minSqft: string | null;
  maxSqft: string | null;
  maxLeaseDuration: string | null;
  amenities: string | null; // comma-separated in URL
}>;
