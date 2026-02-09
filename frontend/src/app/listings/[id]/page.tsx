'use client';

import { ListingCarousel } from '@/components/listing/ListingCarousel';
import { Button } from '@/components/ui/Button';
import { MapPin, Ruler, Bed, Bath, Share2, Heart, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

export default function ListingPage() {
    const params = useParams(); // Use useParams hook for client component compatibility if needed, though props work in Server Components too.
    // We'll stick to client component for interactivity.

    const [isExpanded, setIsExpanded] = useState(false);

    // Mock Data with plenty of images
    const images = [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1512918766755-ee7a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            <ListingCarousel images={images} />

            <div className="p-6 max-w-4xl mx-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold mb-1">Luxury Penthouse</h1>
                        <div className="flex items-center text-muted-foreground gap-1">
                            <MapPin size={16} />
                            <span>555 Park Ave, New York, NY</span>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary">$12,500<span className="text-sm text-foreground font-normal">/mo</span></div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-6 py-6 border-y mb-6 overflow-x-auto no-scrollbar">
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <Bed className="text-primary w-6 h-6" />
                        <div className="text-center">
                            <span className="font-semibold block">3</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Beds</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <Bath className="text-primary w-6 h-6" />
                        <div className="text-center">
                            <span className="font-semibold block">3.5</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Baths</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <Ruler className="text-primary w-6 h-6" />
                        <div className="text-center">
                            <span className="font-semibold block">2,400</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Sq Ft</span>
                        </div>
                    </div>
                </div>

                {/* Description Accordion */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold mb-3">Description</h2>
                    <div className="relative">
                        <p className={cn("text-muted-foreground leading-relaxed text-sm md:text-base transition-all", !isExpanded && "line-clamp-3")}>
                            Experience the pinnacle of luxury living in this stunning penthouse suite. Featuring floor-to-ceiling windows with panoramic views of Central Park, this residence offers an unparalleled lifestyle.
                            The open-concept living area is perfect for entertaining, while the chef's kitchen boasts top-of-the-line appliances including a Sub-Zero fridge and Wolf range.
                            Retreat to the master suite with its spa-like bathroom, walk-in steam shower, and soaking tub. The private terrace offers 800 sqft of outdoor space.
                            Building amenities include a 24-hour white-glove doorman, state-of-the-art fitness center, rooftop pool, and children's playroom.
                            Located steps from world-class dining, shopping, and cultural institutions.
                        </p>
                        <Button variant="link" onClick={() => setIsExpanded(!isExpanded)} className="p-0 h-auto mt-2 text-primary font-semibold">
                            {isExpanded ? 'Read Less' : 'Read More'}
                        </Button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold mb-3">Features</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                        {['Air Conditioning', 'Doorman', 'Gym', 'Pool', 'Elevator', 'Pet Friendly', 'Washer/Dryer', 'Terrace', 'Fireplace'].map(feat => (
                            <div key={feat} className="flex items-center gap-2 text-sm text-foreground/80">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                {feat}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map Placeholder */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold mb-3">Location</h2>
                    <div className="aspect-[16/9] bg-muted rounded-lg flex items-center justify-center text-muted-foreground bg-gray-100 dark:bg-gray-800 border">
                        Map View Integration Coming Soon
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t flex items-center justify-between gap-4 max-w-4xl mx-auto md:relative md:border-t-0 md:bg-transparent md:p-0 md:backdrop-blur-none z-40">
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-muted">
                        <Heart size={20} />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-muted">
                        <Share2 size={20} />
                    </Button>
                </div>
                <Button size="lg" className="flex-grow rounded-full text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                    <MessageCircle className="mr-2" size={20} />
                    Chat with Owner
                </Button>
            </div>
        </div>
    );
}
