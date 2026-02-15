"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PropertyCard } from "@/components/PropertyCard";
import { FilterBar } from "@/components/search/FilterBar";
import { Pagination } from "@/components/search/Pagination";
import { Footer } from "@/components/layout/Footer";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Grid, List, Map as MapIcon } from "lucide-react";
import api from "@/lib/api";

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
    const [properties, setProperties] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showMap, setShowMap] = useState(false);

    // Search Params
    const lat = parseFloat(searchParams.get("lat") || "40.7128");
    const lng = parseFloat(searchParams.get("lng") || "-74.0060");
    const radius = parseFloat(searchParams.get("radius") || "10");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const beds = searchParams.get("beds");
    const propertyType = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");

    const fetchProperties = useCallback(async () => {
        setLoading(true);
        const limit = showMap ? 8 : 9;
        try {
            let url = `/properties?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}&limit=${limit}`;
            const status = searchParams.get("status");
            if (minPrice) url += `&minPrice=${minPrice}`;
            if (maxPrice) url += `&maxPrice=${maxPrice}`;
            if (beds) url += `&beds=${beds}`;
            if (propertyType) url += `&propertyType=${propertyType}`;
            if (status) url += `&status=${status}`;

            const res = await api.get(url);
            setProperties(res.data.properties);
            setTotalCount(res.data.totalCount);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [lat, lng, radius, minPrice, maxPrice, beds, propertyType, searchParams.get("status"), page, showMap]);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    const handleFilterChange = (newFilters: any) => {
        const params = new URLSearchParams(searchParams.toString());

        const updateParam = (key: string) => {
            if (key in newFilters) {
                const value = newFilters[key];
                if (value !== undefined && value !== null && value !== "") {
                    params.set(key, value.toString());
                } else {
                    params.delete(key);
                }
            }
        };

        updateParam("minPrice");
        updateParam("maxPrice");
        updateParam("beds");
        updateParam("type");
        updateParam("status");

        params.set("page", "1");
        router.push(`/search?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`/search?${params.toString()}`);
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            <FilterBar
                onFilterChange={handleFilterChange}
                initialFilters={{
                    status: searchParams.get("status"),
                    minPrice: searchParams.get("minPrice"),
                    maxPrice: searchParams.get("maxPrice"),
                    beds: searchParams.get("beds"),
                    type: searchParams.get("type"),
                }}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Results Summary & Tools */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
                            {loading ? (
                                <span className="h-8 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
                            ) : (
                                <>{totalCount} Properties found</>
                            )}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Showing homes matching your search criteria
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
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
                                onClick={() => setShowMap(!showMap)}
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
                        {loading ? (
                            <div className={`grid gap-8 ${showMap ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <PropertyCard key={i} id="" title="" address="" price={0} beds={0} baths={0} sqft={0} image="" isLoading />
                                ))}
                            </div>
                        ) : properties.length > 0 ? (
                            <div className={`grid gap-8 ${viewMode === "grid" ? (showMap ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3") : "grid-cols-1"}`}>
                                {properties.map((property) => (
                                    <PropertyCard
                                        key={property.id}
                                        id={property.id}
                                        title={property.title || "Untitled Property"}
                                        address={property.address}
                                        price={Number(property.price)}
                                        beds={property.bedrooms || 0}
                                        baths={property.bathrooms || 0}
                                        sqft={property.size}
                                        status={property.status}
                                        image={property.images[0] || "/placeholder.svg"}
                                        currency={property.currency || "USD"}
                                        leaseDuration={property.leaseDuration}
                                        onMouseEnter={() => setHoveredPropertyId(property.id)}
                                        onMouseLeave={() => setHoveredPropertyId(null)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center bg-transparent">
                                <MapPin className="w-12 h-12 text-slate-300 mb-4" />
                                <h3 className="font-bold text-xl text-slate-900">We couldn't find a perfect match</h3>
                                <p className="text-slate-500 max-w-xs mt-2">
                                    Try adjusting your criteria or expanding your search area.
                                </p>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalCount > 0 && (
                            <div className="mt-16 flex justify-center">
                                <Pagination
                                    currentPage={page}
                                    totalPages={Math.ceil(totalCount / (showMap ? 8 : 9))}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right: Map (Sticky) - Conditional */}
                    {showMap && (
                        <div className="hidden lg:block w-[450px] h-[calc(100vh-200px)] sticky top-44 rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800/50 z-10 animate-in fade-in slide-in-from-right-4 duration-300">
                            <Map listings={properties} center={[lat, lng]} zoom={13} hoveredListingId={hoveredPropertyId} />
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
