export type TransactionType = "FOR_SALE" | "FOR_RENT";
export type PropertyType = "APARTMENT" | "HOUSE" | "OFFICE";

export interface PropertyAddress {
  addressLine: string;
  country?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  street?: string;
  houseNumber?: string;
  latitude: number | null;
  longitude: number | null;
}

export interface PropertyDetails {
  sqft: number;
  beds: number;
  baths: number;
  yearBuilt: number;
  amenities: string[];
}

export interface PropertyPricing {
  currency: string;
  price: number;
  negotiable: boolean;
  leaseDuration?: string;
  availableDate?: string;
}

export interface AvailabilitySlot {
  dayOfWeek?: number;
  date?: string;
  startTime: string;
  endTime: string;
}
