import { useState } from "react";
import { UseFormSetValue } from "react-hook-form";
import { ListingFormValues } from "./useListingForm";

export const useGeocoding = (setValue: UseFormSetValue<ListingFormValues>) => {
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]);
    const [mapZoom, setMapZoom] = useState(13);

    const searchAddress = async (address: string) => {
        if (!address || address.length < 1) return;

        setIsGeocoding(true);

        // Clear previous values to ensure validation fails if search fails
        setValue("latitude", null as any);
        setValue("longitude", null as any);
        setValue("country", "");
        setValue("city", "");
        setValue("state", "");
        setValue("zipCode", "");
        setValue("street", "");
        setValue("houseNumber", "");

        try {
            const res = await fetch(`http://localhost:5000/geo/search?q=${encodeURIComponent(address)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon, address: addrDetails } = data[0];
                const latitude = parseFloat(lat);
                const longitude = parseFloat(lon);

                setValue("latitude", latitude, { shouldValidate: true });
                setValue("longitude", longitude, { shouldValidate: true });
                setValue("country", addrDetails.country || "", { shouldValidate: true });
                setValue("city", addrDetails.city || addrDetails.town || addrDetails.village || addrDetails.city_district || addrDetails.hamlet || addrDetails.suburb || "", { shouldValidate: true });
                setValue("state", addrDetails.state || "", { shouldValidate: true });
                setValue("zipCode", addrDetails.postcode || "", { shouldValidate: true });
                setValue("street", addrDetails.road || "", { shouldValidate: true });
                setValue("houseNumber", addrDetails.house_number || "", { shouldValidate: true });

                // Update display address
                if (addrDetails.road && addrDetails.city) {
                    const fullAddr = [
                        addrDetails.house_number,
                        addrDetails.road,
                        addrDetails.city,
                        addrDetails.country
                    ].filter(Boolean).join(", ");
                    setValue("address", fullAddr, { shouldValidate: true });
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
        setValue("latitude", lat, { shouldValidate: true });
        setValue("longitude", lng, { shouldValidate: true });
        setMapCenter([lat, lng]);

        setIsGeocoding(true);
        try {
            const res = await fetch(`http://localhost:5000/geo/reverse?lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.address) {
                const addrDetails = data.address;
                setValue("country", addrDetails.country || "", { shouldValidate: true });
                setValue("city", addrDetails.city || addrDetails.town || addrDetails.village || addrDetails.city_district || addrDetails.hamlet || addrDetails.suburb || "", { shouldValidate: true });
                setValue("state", addrDetails.state || "", { shouldValidate: true });
                setValue("zipCode", addrDetails.postcode || "", { shouldValidate: true });
                setValue("street", addrDetails.road || "", { shouldValidate: true });
                setValue("houseNumber", addrDetails.house_number || "", { shouldValidate: true });

                const fullAddr = [
                    addrDetails.house_number,
                    addrDetails.road,
                    addrDetails.city,
                    addrDetails.country
                ].filter(Boolean).join(", ");
                setValue("address", fullAddr, { shouldValidate: true });
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
