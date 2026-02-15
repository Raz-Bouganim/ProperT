import { AddressDetails } from '../types/geocoding';

export const extractCityName = (address: AddressDetails): string => {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.city_district ||
    address.hamlet ||
    address.suburb ||
    ""
  );
};

export const formatFullAddress = (address: AddressDetails): string => {
  return [
    address.house_number,
    address.road,
    extractCityName(address),
    address.country
  ]
    .filter(Boolean)
    .join(", ");
};
