"use client";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { PropertyCard } from "./PropertyCard";

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
        leaseDuration?: string;
        currency?: string;
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
        longitude,
        leaseDuration,
        currency = "USD"
    } = data;

    const formattedPrice = price ? price.toLocaleString() : "0";
    const statusText = transactionType === "FOR_RENT" ? "For Rent" : "For Sale";
    const priceDisplay = transactionType === "FOR_RENT" ? `$${formattedPrice}/mo` : `$${formattedPrice}`;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center gap-2 text-slate-900 px-1">
                <span className="material-icons-outlined text-primary text-lg">visibility</span>
                <span className="font-bold text-sm">Live Preview</span>
            </div>

            {/* Main Card */}
            <PropertyCard
                id="preview"
                title={title}
                price={price}
                address={address}
                beds={beds}
                baths={baths}
                sqft={sqft}
                image={image || ""}
                status={statusText}
                preview={true}
                type="Preview"
                leaseDuration={leaseDuration}
                currency={currency}
            />

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
