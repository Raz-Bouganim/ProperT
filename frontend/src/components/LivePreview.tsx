"use client";

import Image from "next/image";
import { Bed, Bath, Square, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import Map to avoid SSR issues
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
        </div>
    ),
});

interface LivePreviewProps {
    data: {
        title?: string;
        price?: number;
        address?: string;
        beds?: number;
        baths?: number;
        sqft?: number;
        image?: string;
        transactionType?: string;
        latitude?: number;
        longitude?: number;
    };
    className?: string;
}

export function LivePreview({ data, className }: LivePreviewProps) {
    const {
        title = "Your Property Title",
        price = 0,
        address = "Property Address",
        beds = 0,
        baths = 0,
        sqft = 0,
        image,
        transactionType = "FOR_SALE",
        latitude,
        longitude
    } = data;

    const formattedPrice = price ? price.toLocaleString() : "0";
    const statusText = transactionType === "FOR_RENT" ? "For Rent" : "For Sale";

    return (
        <div className={cn("space-y-4 sticky top-32", className)}>
            {/* Header */}
            <div className="flex items-center gap-2 text-slate-900 px-1">
                <span className="material-icons-outlined text-primary text-lg">visibility</span>
                <span className="font-bold text-sm">Live Preview</span>
            </div>

            {/* Main Card */}
            <div className="bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
                {/* Image Section */}
                <div className="relative aspect-[4/3] bg-slate-100 group overflow-hidden">
                    {image ? (
                        <Image
                            src={image}
                            alt="Preview"
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-slate-200 flex items-center justify-center">
                                    <span className="material-icons-outlined text-3xl">image</span>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">No Image</span>
                            </div>
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4 bg-[#2563EB] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm z-10">
                        {statusText}
                    </div>

                    {/* Heart Icon */}
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-white/30 transition-colors">
                        <span className="material-icons-outlined text-sm">favorite_border</span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-5">
                    {/* Title & New Badge */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                            {title || "Modern Oceanfront Villa"}
                        </h3>
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs mb-6">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{address || "Miami Beach, FL 33139"}</span>
                    </div>

                    {/* Specs Pills */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                            <Bed className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">{beds} Beds</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                            <Bath className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">{baths} Baths</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">{sqft?.toLocaleString()} sqft</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-100 w-full mb-4"></div>

                    {/* Footer: Price & Action */}
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                            <div className="text-2xl font-black text-[#2563EB] tracking-tight">
                                ${formattedPrice}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Placeholder Card */}
            {/* Map Preview Card */}
            <div className="h-32 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative">
                {latitude && longitude ? (
                    <Map
                        listings={[{ id: "preview", latitude, longitude }]}
                        center={[latitude, longitude]}
                        zoom={15}
                        isInteractive={false}
                        className="rounded-none pointer-events-none grayscale-[0.2]"
                    />
                ) : (
                    <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                        backgroundSize: '10px 10px'
                    }}></div>
                )}
            </div>
        </div>
    );
}
