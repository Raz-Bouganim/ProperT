'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ListingCarouselProps {
    images: string[];
}

export function ListingCarousel({ images }: ListingCarouselProps) {
    const [current, setCurrent] = useState(0);

    const next = () => setCurrent((c) => (c + 1) % images.length);
    const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);

    return (
        <div className="relative aspect-video bg-muted overflow-hidden group">
            <div
                className="absolute inset-0 flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {images.map((src, idx) => (
                    <div key={idx} className="min-w-full h-full relative">
                        <Image
                            src={src}
                            alt={`Listing Image ${idx + 1}`}
                            fill
                            className="object-cover"
                            priority={idx === 0}
                            sizes="100vw"
                        />
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={prev} className="bg-black/20 text-white hover:bg-black/40 rounded-full h-10 w-10">
                    <ChevronLeft size={24} />
                </Button>
                <Button variant="ghost" size="icon" onClick={next} className="bg-black/20 text-white hover:bg-black/40 rounded-full h-10 w-10">
                    <ChevronRight size={24} />
                </Button>
            </div>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                    <button
                        key={idx}
                        className={cn("w-2 h-2 rounded-full transition-all shadow-sm", idx === current ? "bg-white scale-125" : "bg-white/50 hover:bg-white/80")}
                        onClick={() => setCurrent(idx)}
                    />
                ))}
            </div>
        </div>
    );
}
