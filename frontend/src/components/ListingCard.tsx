"use client";

import Image from "next/image";
import Link from "next/link";
import { Bed, Bath, Square, Heart } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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
}: ListingCardProps) {
    if (isLoading) {
        return (
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-[4/3] bg-muted mb-4" />
                <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="flex gap-4 pt-2">
                        <div className="h-3 bg-muted rounded w-8" />
                        <div className="h-3 bg-muted rounded w-8" />
                        <div className="h-3 bg-muted rounded w-8" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Link
            href={`/listings/${id}`}
            className="group relative flex flex-col rounded-2xl border bg-card overflow-hidden shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        >
            <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        // Handle favorite logic
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 transition-colors hover:bg-white hover:text-red-500"
                >
                    <Heart className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white font-bold text-sm">
                    ${price.toLocaleString()}
                    <span className="text-[10px] font-normal opacity-80 ml-1">/ mo</span>
                </div>
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-lg leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1 mb-4">
                    {address}
                </p>

                <div className="mt-auto flex items-center justify-between border-t pt-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Bed className="w-4 h-4" />
                        <span className="text-xs font-semibold">{beds}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Bath className="w-4 h-4" />
                        <span className="text-xs font-semibold">{baths}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Square className="w-4 h-4" />
                        <span className="text-xs font-semibold">{sqft}</span>
                        <span className="text-[10px]">sqft</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
