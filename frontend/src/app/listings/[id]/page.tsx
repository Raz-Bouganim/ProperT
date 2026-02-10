"use client";

import { use } from "react";
import { Button } from "@/components/ui/Button";
import { Bed, Bath, Square, MapPin, Share2, Heart, ShieldCheck, Mail, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    // Mock data for design purposes
    const listing = {
        id,
        title: "Modern Apartment in City Center",
        description: "Experience luxury living in this stunning, fully renovated apartment located in the heart of the city. This home features high-end finishes throughout, including white oak floors, custom cabinetry, and premium appliances. Large floor-to-ceiling windows offer plenty of natural light and breathtaking views of the skyline.\n\nThe open-concept living area is perfect for entertaining, while the spacious bedrooms provide a peaceful retreat. The building also offers top-notch amenities, including a 24-hour concierge, a fully equipped fitness center, and a rooftop terrace with panoramic city views.",
        price: 2500,
        address: "123 Madison Ave, New York, NY 10001",
        beds: 2,
        baths: 1,
        sqft: 850,
        type: "APARTMENT",
        images: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1502005229762-ce132d8a923d?auto=format&fit=crop&w=800&q=80",
        ],
        features: ["Air Conditioning", "Dishwasher", "Walk-in Closet", "Hardwood Floors", "Pet Friendly", "Balcony"],
        owner: {
            name: "John Smith",
            avatar: "https://i.pravatar.cc/150?u=john",
            joined: "Jan 2023",
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Action Bar */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-sm font-medium hover:underline text-muted-foreground flex items-center gap-2">
                        <span>←</span> Back to search
                    </Link>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                            <Share2 className="w-4 h-4" /> Share
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                            <Heart className="w-4 h-4" /> Save
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <header className="mb-8">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">{listing.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{listing.address}</span>
                        </div>
                    </div>
                </header>

                {/* Masonry Gallery */}
                <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[500px] mb-12 rounded-2xl overflow-hidden">
                    <div className="col-span-2 row-span-2 relative">
                        <Image src={listing.images[0]} alt="Property" fill className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                    </div>
                    <div className="relative">
                        <Image src={listing.images[1]} alt="Property" fill className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                    </div>
                    <div className="relative">
                        <Image src={listing.images[2]} alt="Property" fill className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                    </div>
                    <div className="relative">
                        <Image src={listing.images[3]} alt="Property" fill className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                    </div>
                    <div className="relative">
                        <Image src={listing.images[4]} alt="Property" fill className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white pointer-events-none font-bold">
                            View all photos
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-8 py-6 border-b border-t mb-8 overflow-x-auto no-scrollbar">
                            <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                <Bed className="w-6 h-6 text-primary" />
                                <span className="font-bold text-lg">{listing.beds}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Beds</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                <Bath className="w-6 h-6 text-primary" />
                                <span className="font-bold text-lg">{listing.baths}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Baths</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                <Square className="w-6 h-6 text-primary" />
                                <span className="font-bold text-lg">{listing.sqft}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Sqft</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                <ShieldCheck className="w-6 h-6 text-green-500" />
                                <span className="font-bold text-sm">Verified</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Listing</span>
                            </div>
                        </div>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold mb-4">About this home</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                                {listing.description}
                            </p>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold mb-6">Amenities</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                                {listing.features.map((feature) => (
                                    <div key={feature} className="flex items-center gap-3 text-muted-foreground">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <span className="font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold mb-6">Location</h2>
                            <div className="aspect-video relative rounded-2xl bg-muted overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground italic">
                                    Map integration coming soon...
                                </div>
                            </div>
                            <p className="mt-4 text-muted-foreground flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" /> {listing.address}
                            </p>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 p-8 rounded-3xl border shadow-xl bg-card">
                            <div className="flex items-baseline justify-between mb-8">
                                <div>
                                    <span className="text-3xl font-black">${listing.price.toLocaleString()}</span>
                                    <span className="text-muted-foreground font-medium ml-1">/ mo</span>
                                </div>
                                <div className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Available Now</div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors">Select Dates</div>
                                    <div className="flex items-center gap-2 font-bold">
                                        <Calendar className="w-4 h-4" />
                                        Choose available slot
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Button size="lg" className="w-full h-14 text-lg rounded-2xl font-bold">Request a viewing</Button>
                                <Button size="lg" variant="outline" className="w-full h-14 text-lg rounded-2xl font-bold gap-2">
                                    <Mail className="w-5 h-5" /> Message Owner
                                </Button>
                            </div>

                            <div className="mt-8 pt-8 border-t flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                    <Image src={listing.owner.avatar} alt={listing.owner.name} fill />
                                </div>
                                <div>
                                    <div className="font-bold leading-tight uppercase tracking-widest text-[10px] text-muted-foreground">Managed by</div>
                                    <div className="font-black text-lg">{listing.owner.name}</div>
                                    <div className="text-xs text-muted-foreground">Joined {listing.owner.joined}</div>
                                </div>
                            </div>

                            <p className="mt-6 text-[10px] text-center text-muted-foreground italic">
                                By clicking "Request a viewing", you agree to our terms of service and direct connection policy.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
