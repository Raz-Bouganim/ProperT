"use client";

import Image from "next/image";
import Link from "next/link";
import { Bed, Bath, Square, Heart, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PropertyCardProps {
    id: string;
    title: string;
    address: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    image: string;
    isLoading?: boolean;
    isFeatured?: boolean;
    type?: string;
    status?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    preview?: boolean;
    leaseDuration?: string;
}

export function PropertyCard({
    id,
    title,
    address,
    price,
    beds,
    baths,
    sqft,
    image,
    isLoading,
    isFeatured,
    type = "New Construction",
    status = "For Sale",
    onMouseEnter,
    onMouseLeave,
    preview = false,
    leaseDuration,
}: PropertyCardProps) {
    if (isLoading) {
        return (
            <div className="rounded-2xl bg-transparent overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="p-5 space-y-4">
                    <div className="h-6 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <div className="h-4 bg-slate-100 rounded w-12" />
                        <div className="h-4 bg-slate-100 rounded w-12" />
                        <div className="h-4 bg-slate-100 rounded w-12" />
                    </div>
                </div>
            </div>
        );
    }

    const isRent = status?.toLowerCase().includes("rent") || status === "FOR_RENT";
    const Wrapper = (preview ? 'div' : Link) as any;
    const wrapperProps = preview ? {} : { href: `/properties/${id}` };

    return (
        <Wrapper
            {...wrapperProps}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="group block bg-transparent border border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 h-full bg-white"
        >
            <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                    src={image || "/placeholder.svg"}
                    alt={title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute top-3 left-3 bg-[#FDF6F0] px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] shadow-sm z-10 border border-[#F5E6D8]">
                    {status?.replace(/_/g, " ")}
                </div>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        if (!preview) {
                            // Favorite logic
                        }
                    }}
                    className={cn(
                        "absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-red-500 transition-all shadow-sm z-10",
                        preview ? "pointer-events-none opacity-80" : "cursor-pointer"
                    )}
                >
                    <Heart className="w-5 h-5" />
                </button>
            </div>

            <div className="p-5">
                <div className="flex items-baseline justify-between gap-2">
                    <div className="flex flex-col">
                        <h3 className="text-2xl font-bold text-primary">
                            ${price.toLocaleString()}{isRent ? "/mo" : ""}
                        </h3>
                        {isRent && leaseDuration && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{leaseDuration}</span>
                        )}
                    </div>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mt-1 line-clamp-1">
                    {title}
                </h4>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{address}</span>
                </p>

                <div className="flex items-center gap-4 mt-5 pt-5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                        <Bed className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold">{beds}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">Beds</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Bath className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold">{baths}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">Baths</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Square className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold">{sqft.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">sqft</span>
                    </div>
                </div>
            </div>
        </Wrapper>
    );
}
