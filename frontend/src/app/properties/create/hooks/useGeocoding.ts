import { useState } from "react";
import { UseFormSetValue } from "react-hook-form";
import { ListingFormValues } from "./useListingForm";
import { GeocodingResult } from '../types/geocoding';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { extractCityName, formatFullAddress } from '../utils/addressParser';

export const useGeocoding = (setValue: UseFormSetValue<ListingFormValues>) => {
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]);
    const [mapZoom, setMapZoom] = useState(13);

    // Safe setValue wrapper with error handling
    const safeSetValue = <K extends keyof ListingFormValues>(
        field: K,
        value: ListingFormValues[K],
        options?: { shouldValidate?: boolean }
    ) => {
        try {
            setValue(field, value as never, options);
        } catch (error) {
            console.error(`Failed to set ${String(field)}:`, error);
        }
    };

    const searchAddress = async (address: string) => {
        if (!address || address.length < 1) return;

        setIsGeocoding(true);

        // Clear previous values to ensure validation fails if search fails
        safeSetValue("latitude", null);
        safeSetValue("longitude", null);
        safeSetValue("country", "");
        safeSetValue("city", "");
        safeSetValue("state", "");
        safeSetValue("zipCode", "");
        safeSetValue("street", "");
        safeSetValue("houseNumber", "");

        try {
            const res = await fetch(API_ENDPOINTS.geoSearch(address));
            const data: GeocodingResult[] = await res.json();

            if (data && data.length > 0) {
                const { lat, lon, address: addrDetails } = data[0];
                const latitude = parseFloat(lat);
                const longitude = parseFloat(lon);

                safeSetValue("latitude", latitude, { shouldValidate: true });
                safeSetValue("longitude", longitude, { shouldValidate: true });
                safeSetValue("country", addrDetails.country || "", { shouldValidate: true });
                safeSetValue("city", extractCityName(addrDetails), { shouldValidate: true });
                safeSetValue("state", addrDetails.state || "", { shouldValidate: true });
                safeSetValue("zipCode", addrDetails.postcode || "", { shouldValidate: true });
                safeSetValue("street", addrDetails.road || "", { shouldValidate: true });
                safeSetValue("houseNumber", addrDetails.house_number || "", { shouldValidate: true });

                // Update display address
                if (addrDetails.road && extractCityName(addrDetails)) {
                    const fullAddr = formatFullAddress(addrDetails);
                    safeSetValue("addressLine", fullAddr, { shouldValidate: true });
                }

                setMapCenter([latitude, longitude]);
                setMapZoom(16);
                setSearchError(null);
            } else {
                setSearchError("Location not found. Try being more specific.");
            }
        } catch (error) {
            console.error("Geocoding failed", error);
            setSearchError("Search failed. Please try again.");
        } finally {
            setIsGeocoding(false);
        }
    };

    const reverseGeocode = async (lat: number, lng: number) => {
        safeSetValue("latitude", lat, { shouldValidate: true });
        safeSetValue("longitude", lng, { shouldValidate: true });
        setMapCenter([lat, lng]);

        setIsGeocoding(true);
        try {
            const res = await fetch(API_ENDPOINTS.geoReverse(lat, lng));
            const data: { address: GeocodingResult['address'] } = await res.json();

            if (data && data.address) {
                const addrDetails = data.address;

                safeSetValue("country", addrDetails.country || "", { shouldValidate: true });
                safeSetValue("city", extractCityName(addrDetails), { shouldValidate: true });
                safeSetValue("state", addrDetails.state || "", { shouldValidate: true });
                safeSetValue("zipCode", addrDetails.postcode || "", { shouldValidate: true });
                safeSetValue("street", addrDetails.road || "", { shouldValidate: true });
                safeSetValue("houseNumber", addrDetails.house_number || "", { shouldValidate: true });

                const fullAddr = formatFullAddress(addrDetails);
                safeSetValue("addressLine", fullAddr, { shouldValidate: true });
                setSearchError(null);
            }
        } catch (error) {
            console.error("Reverse geocoding failed", error);
        } finally {
            setIsGeocoding(false);
        }
    };

    return {
        isGeocoding,
        searchError,
        mapCenter,
        mapZoom,
        setMapCenter,
        setMapZoom,
        searchAddress,
        reverseGeocode
    };
};
