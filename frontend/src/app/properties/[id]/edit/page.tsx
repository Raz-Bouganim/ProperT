"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import type { ListingFormValues } from "@/app/properties/create/hooks/useListingForm";
import { EditPropertyForm, type LockedInfo } from "./components/EditPropertyForm";

// ── Reverse amenity mapping: Prisma enum → frontend kebab-case id ─────────────
const AMENITY_ENUM_TO_ID: Record<string, string> = {
    SWIMMING_POOL: "swimming-pool",
    GYM: "gym",
    PARKING: "parking",
    GARDEN: "garden",
    BALCONY: "balcony",
    ELEVATOR: "elevator",
    SECURITY: "security",
    AIR_CONDITIONING: "air-conditioning",
    HEATING: "heating",
    WASHER_DRYER: "laundry",
    DISHWASHER: "dishwasher",
    WIFI: "wifi",
    FIREPLACE: "fireplace",
    PET_FRIENDLY: "pet-friendly",
    FURNISHED: "furnished",
};

function monthsToSelectValue(months: number | null | undefined): string {
    if (months === 6) return "6 Months";
    if (months === 12) return "12 Months";
    if (months === 24) return "24 Months";
    return "Flexible";
}

function toDateInputString(raw: string | null | undefined): string | undefined {
    if (!raw) return undefined;
    try {
        return new Date(raw).toISOString().split("T")[0];
    } catch {
        return undefined;
    }
}

// ── Local API response shape ───────────────────────────────────────────────────
interface PropertyApiResponse {
    id: string;
    slug?: string;
    ownerId?: string;
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    price?: number | string;
    negotiable?: boolean;
    currency?: string;
    sqft?: number;
    bedrooms?: number | null;
    bathrooms?: number | null;
    yearBuilt?: number | null;
    addressLine?: string;
    city?: string;
    country?: string;
    region?: string | null;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    availableFrom?: string | null;
    leaseDurationMonths?: number | null;
    timeZone?: string;
    virtualTourUrl?: string | null;
    floorPlanUrl?: string | null;
    images?: Array<{ id: string; url: string; isPrimary?: boolean; sortOrder?: number }>;
    amenities?: Array<{ amenity: string }>;
    availabilities?: Array<{
        id: string;
        dayOfWeek?: number | null;
        date?: string | null;
        startTime: string;
        endTime: string;
    }>;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EditPropertyPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    const [property, setProperty] = useState<PropertyApiResponse | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Redirect unauthenticated users
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch listing and verify ownership
    useEffect(() => {
        if (!user) return;
        api.get<PropertyApiResponse>(`/properties/${id}`)
            .then(({ data }) => {
                if (data.ownerId !== user.id) {
                    router.replace(`/properties/${id}`);
                    return;
                }
                setProperty(data);
            })
            .catch((err: unknown) => {
                console.error("Failed to load property for editing:", err);
                setFetchError(
                    "This listing was not found or you don't have permission to edit it."
                );
            })
            .finally(() => setLoading(false));
    }, [user, id, router]);

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    if (fetchError || !property) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
                <p className="text-lg font-bold text-slate-800">
                    {fetchError ?? "Listing not found."}
                </p>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="text-sm text-primary font-bold underline"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    // Sort images: isPrimary desc → sortOrder asc (matches mapper ordering)
    const sortedImages = [...(property.images ?? [])].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

    const initialImages = sortedImages.map((img) => ({ url: img.url, id: img.id }));

    const validCurrencies = ["USD", "EUR", "GBP", "ILS"] as const;
    const currency = validCurrencies.includes(
        property.currency as (typeof validCurrencies)[number]
    )
        ? (property.currency as (typeof validCurrencies)[number])
        : "USD";

    const defaultValues: Partial<ListingFormValues> = {
        transactionType: (property.status as "FOR_SALE" | "FOR_RENT") ?? "FOR_SALE",
        type: (property.type as "APARTMENT" | "HOUSE" | "OFFICE") ?? "APARTMENT",
        title: property.title ?? "",
        description: property.description ?? "",
        addressLine: property.addressLine ?? "",
        country: property.country ?? "",
        city: property.city ?? "",
        state: property.region ?? undefined,
        zipCode: property.postalCode ?? undefined,
        latitude: property.latitude ?? undefined,
        longitude: property.longitude ?? undefined,
        sqft: property.sqft ?? 0,
        beds: property.bedrooms ?? 0,
        baths: property.bathrooms ?? 0,
        yearBuilt: property.yearBuilt ?? undefined,
        amenities: (property.amenities ?? [])
            .map((a) => AMENITY_ENUM_TO_ID[a.amenity] ?? a.amenity)
            .filter(Boolean),
        price: Number(property.price) || 0,
        negotiable: property.negotiable ?? true,
        currency,
        availableDate: toDateInputString(property.availableFrom),
        leaseDuration: monthsToSelectValue(property.leaseDurationMonths),
        timeZone: property.timeZone ?? "UTC",
        virtualTourUrl: property.virtualTourUrl ?? undefined,
        floorPlanUrl: property.floorPlanUrl ?? undefined,
        availabilities: (property.availabilities ?? []).map((a) => ({
            dayOfWeek: a.dayOfWeek ?? undefined,
            date: toDateInputString(a.date),
            startTime: a.startTime,
            endTime: a.endTime,
        })),
    };

    const locked: LockedInfo = {
        type: property.type ?? "APARTMENT",
        transactionType: property.status ?? "FOR_SALE",
        addressLine: property.addressLine ?? "",
        city: property.city ?? "",
        country: property.country ?? "",
        sqft: property.sqft ?? 0,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        yearBuilt: property.yearBuilt,
    };

    return (
        <EditPropertyForm
            propertyId={property.id}
            slug={property.slug ?? property.id}
            defaultValues={defaultValues}
            initialImages={initialImages}
            locked={locked}
        />
    );
}
