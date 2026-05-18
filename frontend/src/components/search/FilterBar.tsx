"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MapPin, ChevronDown, SlidersHorizontal, Loader2 } from "lucide-react";
import type { SearchFilterInitial, SearchFilterPatch } from "@/types/search-filters";
import { FilterModal } from "./FilterModal";
import api from "@/lib/api";

const PRICE_MAX = 5_000_000;
const PRICE_STEP = 10_000;

function fmtPrice(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
    return `$${n}`;
}

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

    const [status, setStatus] = useState<"FOR_SALE" | "FOR_RENT" | null>(
        initialFilters.status === "FOR_RENT" ? "FOR_RENT"
        : initialFilters.status === "FOR_SALE" ? "FOR_SALE"
        : null,
    );
    const [propertyType, setPropertyType] = useState<string | null>(initialFilters.propertyType || null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Price slider state
    const [localMinPrice, setLocalMinPrice] = useState<number>(
        initialFilters.minPrice ? Number(initialFilters.minPrice) : 0,
    );
    const [localMaxPrice, setLocalMaxPrice] = useState<number>(
        initialFilters.maxPrice ? Number(initialFilters.maxPrice) : PRICE_MAX,
    );

    const priceLabel = useMemo(() => {
        if (localMinPrice === 0 && localMaxPrice === PRICE_MAX) return "Price";
        if (localMinPrice === 0) return `Under ${fmtPrice(localMaxPrice)}`;
        if (localMaxPrice === PRICE_MAX) return `${fmtPrice(localMinPrice)}+`;
        return `${fmtPrice(localMinPrice)} – ${fmtPrice(localMaxPrice)}`;
    }, [localMinPrice, localMaxPrice]);

    const applyPriceFilter = useCallback(() => {
        onFilterChange({
            minPrice: localMinPrice > 0 ? localMinPrice : null,
            maxPrice: localMaxPrice < PRICE_MAX ? localMaxPrice : null,
        });
    }, [localMinPrice, localMaxPrice, onFilterChange]);

    const handleMinSlider = (val: number) => {
        setLocalMinPrice(Math.min(val, localMaxPrice - PRICE_STEP));
    };
    const handleMaxSlider = (val: number) => {
        setLocalMaxPrice(Math.max(val, localMinPrice + PRICE_STEP));
    };
    const handleMinInput = (raw: string) => {
        const n = raw === "" ? 0 : Math.max(0, parseInt(raw, 10) || 0);
        setLocalMinPrice(Math.min(n, localMaxPrice - PRICE_STEP));
    };
    const handleMaxInput = (raw: string) => {
        const n = raw === "" ? PRICE_MAX : Math.min(PRICE_MAX, parseInt(raw, 10) || PRICE_MAX);
        setLocalMaxPrice(Math.max(n, localMinPrice + PRICE_STEP));
    };
    const clearPrice = () => {
        setLocalMinPrice(0);
        setLocalMaxPrice(PRICE_MAX);
        onFilterChange({ minPrice: null, maxPrice: null });
    };

    // All-filters modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalBeds, setModalBeds] = useState<number | null>(
        initialFilters.beds ? parseInt(initialFilters.beds, 10) : null,
    );
    const [modalBaths, setModalBaths] = useState<number | null>(
        initialFilters.baths ? parseInt(initialFilters.baths, 10) : null,
    );
    const [modalMinSqft, setModalMinSqft] = useState<number | null>(
        initialFilters.minSqft ? Number(initialFilters.minSqft) : null,
    );
    const [modalMaxSqft, setModalMaxSqft] = useState<number | null>(
        initialFilters.maxSqft ? Number(initialFilters.maxSqft) : null,
    );
    const [modalLeaseDuration, setModalLeaseDuration] = useState<number | null>(
        initialFilters.maxLeaseDuration ? Number(initialFilters.maxLeaseDuration) : null,
    );
    const [modalAmenities, setModalAmenities] = useState<string[]>(
        initialFilters.amenities ? initialFilters.amenities.split(",").filter(Boolean) : [],
    );

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

    const handleStatusChange = (newStatus: "FOR_SALE" | "FOR_RENT" | null) => {
        setStatus(newStatus);
        const newFilters: SearchFilterPatch = { status: newStatus };
        if (newStatus !== "FOR_RENT" && modalLeaseDuration !== null) {
            setModalLeaseDuration(null);
            newFilters.maxLeaseDuration = null;
        }
        onFilterChange(newFilters);
        setActiveDropdown(null);
    };

    const handlePropertyTypeChange = (type: string | null) => {
        setPropertyType(type);
        const newFilters: SearchFilterPatch = { propertyType: type };
        if (type === "OFFICE") {
            setModalBeds(null);
            setModalBaths(null);
            newFilters.beds = null;
            newFilters.baths = null;
        }
        onFilterChange(newFilters);
        setActiveDropdown(null);
    };

    const handleModalApply = (filters: {
        beds: number | null;
        baths: number | null;
        minSqft: number | null;
        maxSqft: number | null;
        maxLeaseDuration: number | null;
        amenities: string[];
    }) => {
        setModalBeds(filters.beds);
        setModalBaths(filters.baths);
        setModalMinSqft(filters.minSqft);
        setModalMaxSqft(filters.maxSqft);
        setModalLeaseDuration(filters.maxLeaseDuration);
        setModalAmenities(filters.amenities);
        onFilterChange({
            beds: filters.beds,
            baths: filters.baths,
            minSqft: filters.minSqft,
            maxSqft: filters.maxSqft,
            maxLeaseDuration: filters.maxLeaseDuration,
            amenities: filters.amenities.length ? filters.amenities : null,
        });
    };

    const activeModalFilterCount = [
        modalBeds !== null,
        modalBaths !== null,
        modalMinSqft !== null || modalMaxSqft !== null,
        modalLeaseDuration !== null,
        modalAmenities.length > 0,
    ].filter(Boolean).length;

    const hasModalFilters = activeModalFilterCount > 0;

    const toggleDropdown = (name: string) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const minPct = (localMinPrice / PRICE_MAX) * 100;
    const maxPct = (localMaxPrice / PRICE_MAX) * 100;
    // When min is near the top, bring it to front so it can still be dragged left
    const minOnTop = localMinPrice >= PRICE_MAX - PRICE_STEP;

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
                        <div className="relative shrink-0">
                            <button
                                onClick={() => toggleDropdown("status")}
                                className={`flex items-center justify-between w-36 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer ${status !== null ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                            >
                                <span className="truncate">
                                    {status === "FOR_SALE" ? "For Sale" : status === "FOR_RENT" ? "For Rent" : "Buy / Rent"}
                                </span>
                                <ChevronDown className="w-4 h-4 opacity-60 shrink-0 ml-2" />
                            </button>
                            {activeDropdown === "status" && (
                                <div className="absolute top-full mt-2 left-0 w-40 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                                    <div className="space-y-1">
                                        {([
                                            { value: null,       label: "All" },
                                            { value: "FOR_SALE", label: "For Sale" },
                                            { value: "FOR_RENT", label: "For Rent" },
                                        ] as const).map(({ value, label }) => (
                                            <button
                                                key={label}
                                                onClick={() => handleStatusChange(value)}
                                                className={`w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer ${status === value ? "bg-slate-50 font-bold text-primary" : ""}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Price Filter */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => toggleDropdown("price")}
                                className={`flex items-center justify-between w-40 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer ${priceLabel !== "Price" ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                            >
                                <span className="truncate">{priceLabel}</span>
                                <ChevronDown className="w-4 h-4 opacity-60 shrink-0 ml-2" />
                            </button>

                            {activeDropdown === "price" && (
                                <div className="absolute top-full mt-2 left-0 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-5 z-50">
                                    {/* Min / Max inputs */}
                                    <div className="flex gap-3 mb-6">
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-slate-500 mb-1.5">Min price</p>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={localMinPrice === 0 ? "" : localMinPrice}
                                                    placeholder="0"
                                                    min={0}
                                                    max={PRICE_MAX}
                                                    step={PRICE_STEP}
                                                    onChange={(e) => handleMinInput(e.target.value)}
                                                    onBlur={applyPriceFilter}
                                                    onKeyDown={(e) => e.key === "Enter" && applyPriceFilter()}
                                                    className="w-full pl-6 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-slate-500 mb-1.5">Max price</p>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={localMaxPrice === PRICE_MAX ? "" : localMaxPrice}
                                                    placeholder="Any"
                                                    min={0}
                                                    max={PRICE_MAX}
                                                    step={PRICE_STEP}
                                                    onChange={(e) => handleMaxInput(e.target.value)}
                                                    onBlur={applyPriceFilter}
                                                    onKeyDown={(e) => e.key === "Enter" && applyPriceFilter()}
                                                    className="w-full pl-6 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dual-range slider */}
                                    <div className="relative h-6 mx-1">
                                        {/* Track background */}
                                        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-200 rounded-full" />
                                        {/* Filled range */}
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-slate-900 rounded-full"
                                            style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
                                        />
                                        {/* Min thumb */}
                                        <input
                                            type="range"
                                            min={0}
                                            max={PRICE_MAX}
                                            step={PRICE_STEP}
                                            value={localMinPrice}
                                            onChange={(e) => handleMinSlider(Number(e.target.value))}
                                            onMouseUp={applyPriceFilter}
                                            onTouchEnd={applyPriceFilter}
                                            className={`price-range-input${minOnTop ? " price-range-input--on-top" : ""}`}
                                        />
                                        {/* Max thumb */}
                                        <input
                                            type="range"
                                            min={0}
                                            max={PRICE_MAX}
                                            step={PRICE_STEP}
                                            value={localMaxPrice}
                                            onChange={(e) => handleMaxSlider(Number(e.target.value))}
                                            onMouseUp={applyPriceFilter}
                                            onTouchEnd={applyPriceFilter}
                                            className={`price-range-input${!minOnTop ? " price-range-input--on-top" : ""}`}
                                        />
                                    </div>

                                    {/* Range labels + clear */}
                                    <div className="flex justify-between items-center mt-4">
                                        <span className="text-xs text-slate-400">$0</span>
                                        {(localMinPrice > 0 || localMaxPrice < PRICE_MAX) && (
                                            <button
                                                type="button"
                                                onClick={clearPrice}
                                                className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 cursor-pointer"
                                            >
                                                Clear
                                            </button>
                                        )}
                                        <span className="text-xs text-slate-400">$5M+</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Property Type Filter */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => toggleDropdown("propertyType")}
                                className={`flex items-center justify-between w-36 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer ${propertyType !== null ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                            >
                                <span className="truncate">{propertyType ? propertyType.charAt(0) + propertyType.slice(1).toLowerCase() : "Type"}</span>
                                <ChevronDown className="w-4 h-4 opacity-60 shrink-0 ml-2" />
                            </button>
                            {activeDropdown === "propertyType" && (
                                <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                                    <div className="space-y-1">
                                        {["APARTMENT", "HOUSE", "OFFICE"].map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => handlePropertyTypeChange(t)}
                                                className={`w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer ${propertyType === t ? "bg-slate-50 font-bold text-primary" : ""}`}
                                            >
                                                {t.charAt(0) + t.slice(1).toLowerCase()}
                                            </button>
                                        ))}
                                        <button onClick={() => handlePropertyTypeChange(null)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm border-t mt-1 pt-2 cursor-pointer">Any Type</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* More Filters Button */}
                        <button
                            onClick={() => setModalOpen(true)}
                            className={`hidden lg:flex items-center justify-between w-40 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer shrink-0 ${
                                hasModalFilters
                                    ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                            }`}
                        >
                            <span className="truncate">More Filters</span>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                <SlidersHorizontal className="w-4 h-4" />
                                {hasModalFilters && (
                                    <span className="bg-white text-slate-900 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">
                                        {activeModalFilterCount}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <FilterModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                initialFilters={{
                    beds: modalBeds,
                    baths: modalBaths,
                    minSqft: modalMinSqft,
                    maxSqft: modalMaxSqft,
                    maxLeaseDuration: modalLeaseDuration,
                    amenities: modalAmenities,
                }}
                onApply={handleModalApply}
                propertyType={propertyType}
                status={status}
            />
        </>
    );
}
