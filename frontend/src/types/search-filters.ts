export type SearchFilterPatch = Partial<{
  minPrice: number | string | null;
  maxPrice: number | string | null;
  beds: number | string | null;
  baths: number | string | null;
  propertyType: string | null;
  status: string | null;
}>;

export type SearchFilterInitial = Partial<{
  status: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  beds: string | null;
  baths: string | null;
  propertyType: string | null;
}>;
