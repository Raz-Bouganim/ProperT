"use client";

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PropertyCard } from "@/components/PropertyCard";
import { FilterBar } from "@/components/search/FilterBar";
import { Pagination } from "@/components/search/Pagination";
import { Footer } from "@/components/layout/Footer";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Grid, List, Map as MapIcon, ChevronDown, ZoomIn } from "lucide-react";
import api from "@/lib/api";
import { coverImageUrl, type PropertyListingPreview } from "@/types/property-listing";
import type { SearchFilterPatch } from "@/types/search-filters";
import type { MapBounds } from "@/components/Map";

const MIN_ZOOM = 14;
const PAGE_LIMIT_GRID = 9;
const PAGE_LIMIT_WITH_MAP = 8;

const SORT_OPTIONS = [
    { value: "newest", label: "Newest" },
    { value: "price_asc", label: "Price: Low → High" },
    { value: "price_desc", label: "Price: High → Low" },
];

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
        </div>
    ),
});

function SearchPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const status = searchParams.get("status");
    const [properties, setProperties] = useState<PropertyListingPreview[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showMap, setShowMap] = useState(false);
    const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [mapFlyTo, setMapFlyTo] = useState<[number, number] | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Search Params
    const lat = parseFloat(searchParams.get("lat") || "40.7128");
    const lng = parseFloat(searchParams.get("lng") || "-74.0060");
    const radius = parseFloat(searchParams.get("radius") || "10");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const beds = searchParams.get("beds");
    const baths = searchParams.get("baths");
    const propertyType = searchParams.get("propertyType");
    const minSqft = searchParams.get("minSqft");
    const maxSqft = searchParams.get("maxSqft");
    const maxLeaseDuration = searchParams.get("maxLeaseDuration");
    const amenities = searchParams.get("amenities");
    const page = parseInt(searchParams.get("page") || "1");
    const sort = searchParams.get("sort") || "newest";

    // zoom < MIN_ZOOM → map shows overlay and stops bbox queries; results panel unchanged
    const zoomTooLow = showMap && mapBounds !== null && mapBounds.zoom < MIN_ZOOM;

    const handleBoundsChange = useCallback((bounds: MapBounds) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setMapBounds(bounds), 500);
    }, []);

    const fetchProperties = useCallback(async () => {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        const limit = showMap ? PAGE_LIMIT_WITH_MAP : PAGE_LIMIT_GRID;
        try {
            let url: string;
            // Use bbox only when map is open, bounds are known, and zoom is sufficient
            if (showMap && mapBounds && mapBounds.zoom >= MIN_ZOOM) {
                url = `/properties?minLat=${mapBounds.minLat}&minLng=${mapBounds.minLng}&maxLat=${mapBounds.maxLat}&maxLng=${mapBounds.maxLng}&page=${page}&limit=${limit}`;
            } else {
                url = `/properties?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}&limit=${limit}`;
            }
            if (minPrice) url += `&minPrice=${minPrice}`;
            if (maxPrice) url += `&maxPrice=${maxPrice}`;
            if (beds) url += `&beds=${beds}`;
            if (baths) url += `&baths=${baths}`;
            if (propertyType) url += `&propertyType=${propertyType}`;
            if (status) url += `&status=${status}`;
            if (minSqft) url += `&minSqft=${minSqft}`;
            if (maxSqft) url += `&maxSqft=${maxSqft}`;
            if (maxLeaseDuration) url += `&maxLeaseDuration=${maxLeaseDuration}`;
            if (amenities) url += `&amenities=${encodeURIComponent(amenities)}`;
            if (sort && sort !== "newest") url += `&sort=${sort}`;

            const res = await api.get(url, { signal: controller.signal });
            setProperties(res.data.properties);
            setTotalCount(res.data.totalCount);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof Error && (err.name === 'CanceledError' || err.name === 'AbortError')) return;
            console.error(err);
            setError("Failed to load properties. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [lat, lng, radius, minPrice, maxPrice, beds, baths, propertyType, status, minSqft, maxSqft, maxLeaseDuration, amenities, page, showMap, mapBounds, sort]);

    useEffect(() => {
        fetchProperties();
        return () => abortControllerRef.current?.abort();
    }, [fetchProperties]);

    // Close sort dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest("[data-sort-dropdown]")) setShowSortDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleFilterChange = (newFilters: SearchFilterPatch) => {
        const params = new URLSearchParams(searchParams.toString());

        const updateParam = (key: keyof SearchFilterPatch) => {
            if (!(key in newFilters)) return;
            const value = newFilters[key];
            if (value !== undefined && value !== null && value !== "") {
                params.set(key, String(value));
            } else {
                params.delete(key);
            }
        };

        updateParam("minPrice");
        updateParam("maxPrice");
        updateParam("beds");
        updateParam("baths");
        updateParam("propertyType");
        updateParam("status");
        updateParam("minSqft");
        updateParam("maxSqft");
        updateParam("maxLeaseDuration");

        // amenities is an array — serialize as comma-separated
        if ("amenities" in newFilters) {
            const a = newFilters.amenities;
            if (a && Array.isArray(a) && a.length > 0) {
                params.set("amenities", a.join(","));
            } else {
                params.delete("amenities");
            }
        }

        params.set("page", "1");
        router.push(`/search?${params.toString()}`);
    };

    const handleLocationSelect = (newLat: number, newLng: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", newLat.toString());
        params.set("lng", newLng.toString());
        params.set("radius", "10");
        params.set("page", "1");
        setMapBounds(null);
        setMapFlyTo([newLat, newLng]);
        router.push(`/search?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`/search?${params.toString()}`);
    };

    const handleSortChange = (newSort: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", newSort);
        params.set("page", "1");
        router.push(`/search?${params.toString()}`);
        setShowSortDropdown(false);
    };

    const returnTo = `/search?${searchParams.toString()}`;
    const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Newest";

    const initialFilters = useMemo(() => ({
        status: searchParams.get("status"),
        minPrice: searchParams.get("minPrice"),
        maxPrice: searchParams.get("maxPrice"),
        beds: searchParams.get("beds"),
        baths: searchParams.get("baths"),
        propertyType: searchParams.get("propertyType"),
        minSqft: searchParams.get("minSqft"),
        maxSqft: searchParams.get("maxSqft"),
        maxLeaseDuration: searchParams.get("maxLeaseDuration"),
        amenities: searchParams.get("amenities"),
    }), [searchParams]);

    return (
        <div className="min-h-screen bg-slate-50/50">
            <FilterBar
                onFilterChange={handleFilterChange}
                onLocationSelect={handleLocationSelect}
                initialLocation={searchParams.get("location") ?? ""}
                initialFilters={initialFilters}
            />
            {error && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                        {error}
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Results Summary & Tools */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
                            {loading && properties.length === 0 ? (
                                <span className="h-8 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
                            ) : (
                                <span className={`transition-opacity duration-200 ${loading ? "opacity-40" : "opacity-100"}`}>
                                    {totalCount} Properties found
                                </span>
                            )}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Showing homes matching your search criteria
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Sort Dropdown */}
                        <div className="relative" data-sort-dropdown>
                            <button
                                onClick={() => setShowSortDropdown((p) => !p)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer h-10"
                            >
                                <span>{sortLabel}</span>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>
                            {showSortDropdown && (
                                <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                                    {SORT_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleSortChange(opt.value)}
                                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer ${sort === opt.value ? "font-bold text-primary" : "text-slate-700"}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* View mode + Map toggle */}
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm h-10">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "grid" ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                                title="Grid View"
                            >
                                <Grid size={18} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "list" ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                                title="List View"
                            >
                                <List size={18} strokeWidth={2.5} />
                            </button>

                            <div className="w-px h-5 bg-slate-200 mx-1.5" />

                            <button
                                onClick={() => { setShowMap((prev) => !prev); if (showMap) setMapBounds(null); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold text-xs uppercase tracking-wider ${showMap ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
                                title="Toggle Map"
                            >
                                <MapIcon size={16} className={showMap ? "text-primary" : "text-slate-400"} strokeWidth={2.5} />
                                <span className={showMap ? "text-primary" : "text-slate-500"}>Map</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: Properties Grid */}
                    <div className="flex-1">
                        {loading && properties.length === 0 ? (
                            <div className={`grid gap-8 ${showMap ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <PropertyCard key={i} id="" title="" address="" price={0} beds={0} baths={0} sqft={0} image="" isLoading />
                                ))}
                            </div>
                        ) : properties.length > 0 ? (
                            <div className={`grid gap-8 transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"} ${viewMode === "grid" ? (showMap ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3") : "grid-cols-1"}`}>
                                {properties.map((property, idx) => (
                                    <PropertyCard
                                        key={property.id}
                                        id={property.id}
                                        priority={idx === 0 && page === 1}
                                        detailsHref={`/properties/${property.slug || property.id}?from=search&returnTo=${encodeURIComponent(returnTo)}`}
                                        title={property.title || "Untitled Property"}
                                        address={property.addressLine ?? property.address ?? ""}
                                        price={Number(property.price)}
                                        beds={property.bedrooms || 0}
                                        baths={property.bathrooms || 0}
                                        sqft={property.sqft ?? property.size ?? 0}
                                        status={property.status}
                                        image={coverImageUrl(property, "/placeholder.svg")}
                                        currency={property.currency || "USD"}
                                        leaseDuration={property.leaseDuration}
                                        leaseDurationLabel={property.leaseDurationLabel}
                                        hideBedBath={property.type === "OFFICE"}
                                        ownerId={property.ownerId}
                                        isHighlighted={hoveredPropertyId === property.id}
                                        onMouseEnter={() => setHoveredPropertyId(property.id)}
                                        onMouseLeave={() => setHoveredPropertyId(null)}
                                    />
                                ))}
                            </div>
                        ) : !loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center bg-transparent">
                                <MapPin className="w-12 h-12 text-slate-300 mb-4" />
                                <h3 className="font-bold text-xl text-slate-900">We couldn&apos;t find a perfect match</h3>
                                <p className="text-slate-500 max-w-xs mt-2">
                                    Try adjusting your criteria or expanding your search area.
                                </p>
                            </div>
                        ) : null}

                        {/* Pagination */}
                        {totalCount > 0 && (
                            <div className="mt-16 flex justify-center">
                                <Pagination
                                    currentPage={page}
                                    totalPages={Math.ceil(totalCount / (showMap ? PAGE_LIMIT_WITH_MAP : PAGE_LIMIT_GRID))}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right: Map (Sticky) */}
                    {showMap && (
                        <div className="hidden lg:block w-[450px] h-[calc(100vh-200px)] sticky top-44 rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800/50 z-10 animate-in fade-in slide-in-from-right-4 duration-300 relative">
                            <Map
                                listings={zoomTooLow ? [] : properties}
                                center={[lat, lng]}
                                zoom={13}
                                hoveredListingId={hoveredPropertyId}
                                onBoundsChange={handleBoundsChange}
                                onListingClick={(id) => setHoveredPropertyId(id)}
                                flyTo={mapFlyTo}
                                isNavigable
                            />
                            {zoomTooLow && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-[1100] rounded-2xl pointer-events-none">
                                    <div className="flex flex-col items-center gap-2 bg-white/90 backdrop-blur-[2px] shadow-lg rounded-2xl px-6 py-4 border border-slate-100">
                                        <ZoomIn className="w-8 h-8 text-slate-500" />
                                        <p className="font-bold text-slate-800 text-sm">Zoom in to see properties</p>
                                        <p className="text-slate-400 text-xs">Pan closer to a neighbourhood</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Mobile View Map Button */}
            {!showMap && (
                <button
                    onClick={() => setShowMap(true)}
                    className="lg:hidden fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all z-40 border border-white/10 cursor-pointer"
                >
                    <MapIcon size={18} />
                    <span className="font-bold text-sm tracking-wide">View Map</span>
                </button>
            )}
            <Footer />
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        }>
            <SearchPageContent />
        </Suspense>
    );
}
