'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FilterModal } from '@/components/search/FilterModal';
import { SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function SearchPage() {
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    const listings = [
        { id: 1, title: "Luxury Loft", location: "SoHo, NY", price: "$3,200/mo", specs: "1 Bed • 1 Bath", image: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80" },
        { id: 2, title: "Modern Condo", location: "Downtown, NY", price: "$4,500/mo", specs: "2 Beds • 2 Baths", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80" },
        { id: 3, title: "Classic Brownstone", location: "Brooklyn, NY", price: "$5,000/mo", specs: "3 Beds • 2 Baths", image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80" },
        { id: 4, title: "Studio Apartment", location: "Queens, NY", price: "$1,900/mo", specs: "Studio • 1 Bath", image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80" },
        { id: 5, title: "Penthouse View", location: "Manhattan, NY", price: "$9,200/mo", specs: "3 Beds • 3 Baths", image: "https://images.unsplash.com/photo-1512918766755-ee7a6c25118c?auto=format&fit=crop&w=800&q=80" },
        { id: 6, title: "Garden House", location: "Staten Island, NY", price: "$2,800/mo", specs: "2 Beds • 1 Bath", image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80" },
        { id: 7, title: "Industrial Loft", location: "Williamsburg, NY", price: "$3,600/mo", specs: "1 Bed • 2 Baths", image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80" },
        { id: 8, title: "River View Apt", location: "Battery Park, NY", price: "$4,100/mo", specs: "2 Beds • 2 Baths", image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80" }
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Search Header */}
            <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b p-4 flex items-center gap-3">
                <div className="flex-grow relative">
                    <input
                        type="text"
                        placeholder="Search city, neighborhood, or address..."
                        className="w-full pl-4 pr-10 py-2.5 rounded-full border bg-muted/50 focus:bg-background transition-all outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                    />
                </div>
                <Button variant="outline" size="icon" className="rounded-full shrink-0 border-input w-11 h-11" onClick={() => setIsFiltersOpen(true)}>
                    <SlidersHorizontal className="h-4 w-4" />
                </Button>
            </div>

            {/* Results Grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {listings.map((item) => (
                    <Link href={`/listings/${item.id}`} key={item.id} className="group cursor-pointer rounded-xl border bg-card overflow-hidden shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                        <div className="aspect-[4/3] bg-muted relative">
                            <Image
                                src={item.image}
                                alt={item.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-md">
                                {item.price}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-semibold text-lg leading-tight truncate pr-2">{item.title}</h3>
                                <div className="flex items-center gap-1 text-yellow-500 text-xs font-medium">⭐ 4.8</div>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mb-3">{item.location}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                                <span className="bg-muted px-2 py-1 rounded">{item.specs}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <FilterModal isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} />
        </div>
    );
}
