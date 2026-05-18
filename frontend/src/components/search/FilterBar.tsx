"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, ChevronDown, SlidersHorizontal, Loader2 } from "lucide-react";
import type { SearchFilterInitial, SearchFilterPatch } from "@/types/search-filters";
import { FilterModal } from "./FilterModal";
import api from "@/lib/api";

interface GeoSuggestion {
    display_name: string;
    lat: string;
    lon: string;
}

interface FilterBarProps {
    onFilterChange: (filters: SearchFilterPatch) => void;
    onLocationSelect?: (lat: number, lng: number, displayName: string) => void;
    initialLocation?: string;
    initialFilters?: SearchFilterInitial;
}

export function FilterBar({
    onFilterChange,
    onLocationSelect,
    initialLocation = "",
    initialFilters = {},
}: FilterBarProps) {
    const [location, setLocation] = useState(initialLocation);
    const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const geoDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const [status, setStatus] = useState<"FOR_SALE" | "FOR_RENT">(
        initialFilters.status === "FOR_RENT" ? "FOR_RENT" : "FOR_SALE",
    );
    const [propertyType, setPropertyType] = useState<string | null>(initialFilters.propertyType || null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // All-filters modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalBeds, setModalBeds] = useState<number | null>(
        initialFilters.beds ? parseInt(initialFilters.beds, 10) : null,
    );
    const [modalBaths, setModalBaths] = useState<number | null>(
        initialFilters.baths ? parseInt(initialFilters.baths, 10) : null,
    );
    const [modalMinPrice, setModalMinPrice] = useState<number | null>(
        initialFilters.minPrice ? Number(initialFilters.minPrice) : null,
    );
    const [modalMaxPrice, setModalMaxPrice] = useState<number | null>(
        initialFilters.maxPrice ? Number(initialFilters.maxPrice) : null,
    );
    const [priceLabel, setPriceLabel] = useState<string>(() => {
        const minN = initialFilters.minPrice ? parseFloat(initialFilters.minPrice) : null;
        const maxN = initialFilters.maxPrice ? parseFloat(initialFilters.maxPrice) : null;
        if (!minN && !maxN) return "Price";
        const fmt = (n: number) => n >= 1_000_000 ? `$${n / 1_000_000}M` : `$${n / 1_000}k`;
        if (!minN) return `Under ${fmt(maxN!)}`;
        if (!maxN) return `${fmt(minN)}+`;
        return `${fmt(minN)} – ${fmt(maxN)}`;
    });

    // Close suggestions when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                !inputRef.current?.contains(e.target as Node) &&
                !suggestionsRef.current?.contains(e.target as Node)
            ) {
                setSuggestionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const fetchSuggestions = useCallback(async (q: string) => {
        if (q.length < 2) { setSuggestions([]); setSuggestionsOpen(false); return; }
        setGeoLoading(true);
        try {
            const res = await api.get<GeoSuggestion[]>(`/geo/search?q=${encodeURIComponent(q)}`);
            setSuggestions(res.data.slice(0, 5));
            setSuggestionsOpen(res.data.length > 0);
        } catch {
            setSuggestions([]);
        } finally {
            setGeoLoading(false);
        }
    }, []);

    const handleLocationInput = (value: string) => {
        setLocation(value);
        clearTimeout(geoDebounce.current);
        geoDebounce.current = setTimeout(() => fetchSuggestions(value), 300);
    };

    const handleSuggestionClick = (s: GeoSuggestion) => {
        const lat = parseFloat(s.lat);
        const lon = parseFloat(s.lon);
        if (!isFinite(lat) || !isFinite(lon)) return;
        setLocation(s.display_name);
        setSuggestionsOpen(false);
        setSuggestions([]);
        onLocationSelect?.(lat, lon, s.display_name);
    };

    const handleFilterUpdate = (
        key: "status" | "price" | "propertyType",
        value: "FOR_SALE" | "FOR_RENT" | { min?: number; max?: number; label?: string } | null | string,
    ) => {
        const newFilters: SearchFilterPatch = {};
        if (key === "status") {
            setStatus(value as "FOR_SALE" | "FOR_RENT");
            newFilters.status = value as "FOR_SALE" | "FOR_RENT";
        } else if (key === "price") {
            const pr = value as { min?: number; max?: number; label?: string } | null;
            newFilters.minPrice = pr?.min ?? null;
            newFilters.maxPrice = pr?.max ?? null;
            setPriceLabel(pr?.label ?? "Price");
        } else if (key === "propertyType") {
            setPropertyType(value as string | null);
            newFilters.propertyType = value as string | null;
        }
        onFilterChange(newFilters);
        setActiveDropdown(null);
    };

    const handleModalApply = (filters: { beds: number | null; baths: number | null; minPrice: number | null; maxPrice: number | null }) => {
        setModalBeds(filters.beds);
        setModalBaths(filters.baths);
        setModalMinPrice(filters.minPrice);
        setModalMaxPrice(filters.maxPrice);
        onFilterChange({ beds: filters.beds, baths: filters.baths, minPrice: filters.minPrice, maxPrice: filters.maxPrice });
    };

    const hasModalFilters = modalBeds !== null || modalBaths !== null || modalMinPrice !== null || modalMaxPrice !== null;

    const toggleDropdown = (name: string) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    return (
        <>
            <div className="bg-white border-b border-slate-200 py-4 sticky top-16 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                        {/* Location Input with Autocomplete */}
                        <div className="relative flex-1 min-w-[260px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                {geoLoading
                                    ? <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                                    : <MapPin className="h-5 w-5 text-slate-400" />
                                }
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg leading-5 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-shadow"
                                placeholder="Search location…"
                                value={location}
                                onChange={(e) => handleLocationInput(e.target.value)}
                                onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                            />
                            {suggestionsOpen && suggestions.length > 0 && (
                                <div
                                    ref={suggestionsRef}
                                    className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                                >
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSuggestionClick(s)}
                                            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-start gap-2 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                        >
                                            <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                            <span className="line-clamp-1">{s.display_name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="bg-slate-100 p-1 rounded-lg flex items-center shrink-0">
                            <button
                                onClick={() => handleFilterUpdate("status", "FOR_SALE")}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all cursor-pointer ${status === "FOR_SALE" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                For Sale
                            </button>
                            <button
                                onClick={() => handleFilterUpdate("status", "FOR_RENT")}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all cursor-pointer ${status === "FOR_RENT" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                For Rent
                            </button>
                        </div>

                        {/* Price Filter */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => toggleDropdown("price")}
                                className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer ${priceLabel !== "Price" ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                            >
                                <span>{priceLabel}</span>
                                <ChevronDown className="w-4 h-4 opacity-60" />
                            </button>
                            {activeDropdown === "price" && (
                                <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50">
                                    <div className="space-y-1">
                                        <button onClick={() => handleFilterUpdate("price", null)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">Any Price</button>
                                        <button onClick={() => handleFilterUpdate("price", { max: 500000, label: "Under $500k" })} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">Under $500k</button>
                                        <button onClick={() => handleFilterUpdate("price", { min: 500000, max: 1000000, label: "$500k – $1M" })} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">$500k – $1M</button>
                                        <button onClick={() => handleFilterUpdate("price", { min: 1000000, max: 2000000, label: "$1M – $2M" })} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">$1M – $2M</button>
                                        <button onClick={() => handleFilterUpdate("price", { min: 2000000, label: "$2M+" })} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">$2M+</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Property Type Filter */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => toggleDropdown("propertyType")}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
                            >
                                <span>{propertyType ? propertyType.charAt(0) + propertyType.slice(1).toLowerCase() : "Type"}</span>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>
                            {activeDropdown === "propertyType" && (
                                <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                                    <div className="space-y-1">
                                        {["APARTMENT", "HOUSE", "OFFICE"].map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => handleFilterUpdate("propertyType", t)}
                                                className={`w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer ${propertyType === t ? "bg-slate-50 font-bold text-primary" : ""}`}
                                            >
                                                {t.charAt(0) + t.slice(1).toLowerCase()}
                                            </button>
                                        ))}
                                        <button onClick={() => handleFilterUpdate("propertyType", null)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm border-t mt-1 pt-2 cursor-pointer">Any Type</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* All Filters Button */}
                        <button
                            onClick={() => setModalOpen(true)}
                            className={`hidden lg:flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer shrink-0 ${
                                hasModalFilters
                                    ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                            }`}
                        >
                            All Filters
                            <SlidersHorizontal className="w-4 h-4" />
                            {hasModalFilters && (
                                <span className="ml-1 bg-white text-slate-900 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">
                                    {[modalBeds !== null, modalBaths !== null, modalMinPrice !== null, modalMaxPrice !== null].filter(Boolean).length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <FilterModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                initialFilters={{ beds: modalBeds, baths: modalBaths, minPrice: modalMinPrice, maxPrice: modalMaxPrice }}
                onApply={handleModalApply}
            />
        </>
    );
}
