"use client";

import { useState } from "react";
import { MapPin, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { SearchFilterInitial, SearchFilterPatch } from "@/types/search-filters";

interface FilterBarProps {
    onFilterChange: (filters: SearchFilterPatch) => void;
    initialLocation?: string;
    initialFilters?: SearchFilterInitial;
}

export function FilterBar({ onFilterChange, initialLocation = "San Francisco, CA", initialFilters = {} }: FilterBarProps) {
    const [location, setLocation] = useState(initialLocation);
    const [status, setStatus] = useState<"FOR_SALE" | "FOR_RENT">(
        (initialFilters.status === "FOR_RENT" ? "FOR_RENT" : "FOR_SALE"),
    );
    const [, setPriceRange] = useState<{ min: number; max: number } | null>(
        initialFilters.minPrice || initialFilters.maxPrice
            ? {
                  min: initialFilters.minPrice ? Number(initialFilters.minPrice) : 0,
                  max: initialFilters.maxPrice ? Number(initialFilters.maxPrice) : 0,
              }
            : null
    );
    const [propertyType, setPropertyType] = useState<string | null>(initialFilters.type || null);
    const [beds, setBeds] = useState<number | null>(initialFilters.beds ? parseInt(initialFilters.beds, 10) : null);

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const handleFilterUpdate = (
        key: "status" | "price" | "type" | "beds",
        value: "FOR_SALE" | "FOR_RENT" | { min?: number; max?: number } | null | string | number | null,
    ) => {
        const newFilters: SearchFilterPatch = {};
        if (key === "status") {
            setStatus(value as "FOR_SALE" | "FOR_RENT");
            newFilters.status = value as "FOR_SALE" | "FOR_RENT";
        } else if (key === "price") {
            const pr = value as { min?: number; max?: number } | null;
            setPriceRange(
                pr && (pr.min !== undefined || pr.max !== undefined)
                    ? { min: pr.min ?? 0, max: pr.max ?? pr.min ?? 0 }
                    : null,
            );
            newFilters.minPrice = pr?.min;
            newFilters.maxPrice = pr?.max;
        } else if (key === "type") {
            setPropertyType(value as string | null);
            newFilters.type = value as string | null;
        } else if (key === "beds") {
            setBeds(value as number | null);
            newFilters.beds = value as number | null;
        }

        onFilterChange(newFilters);
        setActiveDropdown(null);
    };

    const toggleDropdown = (name: string) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    return (
        <div className="bg-white border-b border-slate-200 py-4 sticky top-16 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                    {/* Location Input */}
                    <div className="relative flex-1 min-w-[300px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg leading-5 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-shadow"
                            placeholder="San Francisco, CA"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </div>

                    {/* Status Filter (Rent/Sale) */}
                    <div className="bg-slate-100 p-1 rounded-lg flex items-center">
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
                    <div className="relative">
                        <button
                            onClick={() => toggleDropdown("price")}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
                        >
                            <span>Price</span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                        {activeDropdown === "price" && (
                            <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50">
                                <div className="space-y-2">
                                    <button onClick={() => handleFilterUpdate("price", null)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">Any Price</button>
                                    <button onClick={() => handleFilterUpdate("price", { min: 0, max: 500000 })} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">Under $500k</button>
                                    <button onClick={() => handleFilterUpdate("price", { min: 500000, max: 1000000 })} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">$500k - $1M</button>
                                    <button onClick={() => handleFilterUpdate("price", { min: 1000000, max: 2000000 })} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">$1M - $2M</button>
                                    <button onClick={() => handleFilterUpdate("price", { min: 2000000 })} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer">$2M+</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Property Type Filter */}
                    <div className="relative">
                        <button
                            onClick={() => toggleDropdown("type")}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
                        >
                            <span>Type</span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                        {activeDropdown === "type" && (
                            <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                                <div className="space-y-1">
                                    {["APARTMENT", "HOUSE", "OFFICE"].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => handleFilterUpdate("type", t)}
                                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer ${propertyType === t ? "bg-slate-50 font-bold text-primary" : ""}`}
                                        >
                                            {t.charAt(0) + t.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                    <button onClick={() => handleFilterUpdate("type", null)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm border-t mt-1 pt-2 cursor-pointer">Any Type</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Beds Filter */}
                    <div className="relative">
                        <button
                            onClick={() => toggleDropdown("beds")}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
                        >
                            <span>Beds</span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                        {activeDropdown === "beds" && (
                            <div className="absolute top-full mt-2 left-0 w-32 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                                <div className="space-y-1">
                                    {[1, 2, 3, 4, 5].map((b) => (
                                        <button
                                            key={b}
                                            onClick={() => handleFilterUpdate("beds", b)}
                                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm cursor-pointer ${beds === b ? "bg-slate-50 font-bold text-primary" : ""}`}
                                        >
                                            {b}+ Beds
                                        </button>
                                    ))}
                                    <button onClick={() => handleFilterUpdate("beds", null)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm border-t mt-1 pt-2 cursor-pointer">Any</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* All Filters Button */}
                    <button className="hidden lg:flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer">
                        All Filters
                        <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>
        </div>
    );
}
