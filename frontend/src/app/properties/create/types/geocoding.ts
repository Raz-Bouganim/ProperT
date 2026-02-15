export interface Coordinates {
  lat: number;
  lon: number;
}

export interface AddressDetails {
  country?: string;
  city?: string;
  town?: string;
  village?: string;
  city_district?: string;
  hamlet?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  road?: string;
  house_number?: string;
}

export interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  address: AddressDetails;
}
