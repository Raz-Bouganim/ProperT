"use client";

import Image from "next/image";
import Link from "next/link";
import { Bed, Bath, Square, Heart, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListingCardProps {
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
}

export function ListingCard({
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
    type = "For Sale",
}: ListingCardProps) {
    if (isLoading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-[4/3] bg-slate-100 mb-4" />
                <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="flex gap-4 pt-2">
                        <div className="h-3 bg-slate-100 rounded w-8" />
                        <div className="h-3 bg-slate-100 rounded w-8" />
                        <div className="h-3 bg-slate-100 rounded w-8" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Link
            href={`/listings/${id}`}
            className="group block rounded-2xl border border-slate-200 overflow-hidden bg-white hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1"
        >
            <div className="relative h-60 overflow-hidden">
                <Image
                    src={image || "/placeholder.svg"}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        {type}
                    </span>
                </div>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        // Favorite logic
                    }}
                    className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full transition-colors text-white"
                >
                    <Heart className="w-5 h-5 fill-transparent" />
                </button>
            </div>

            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors mb-1 truncate">
                            {title}
                        </h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{address}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Bed className="w-4 h-4" />
                        <span className="text-sm font-semibold">{beds} Bed</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Bath className="w-4 h-4" />
                        <span className="text-sm font-semibold">{baths} Bath</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 ml-auto font-black text-primary">
                        ${price.toLocaleString()}
                    </div>
                </div>
            </div>
        </Link>
    );
}
