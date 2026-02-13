"use client";

import { use } from "react";
import { Button } from "@/components/ui/Button";
import { Bed, Bath, Square, MapPin, Share2, Heart, ShieldCheck, Mail, Calendar, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { BookingWizard } from "@/components/BookingWizard";
import { ChatWindow } from "@/components/ChatWindow";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const { user } = useAuth();
    const [listing, setListing] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchListing = async () => {
            try {
                const res = await api.get(`/listings/${id}`);
                setListing(res.data);
            } catch (error) {
                console.error("Failed to fetch listing:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchListing();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium">Loading property details...</p>
                </div>
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 text-center">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Listing not found</h2>
                    <p className="text-muted-foreground mb-6">The property you're looking for doesn't exist or has been removed.</p>
                    <Link href="/search">
                        <Button variant="outline">Back to Search</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const displayListing = {
        ...listing,
        images: (listing.images && listing.images.length > 0) ? listing.images : ["/placeholder-property.svg"],
        owner: {
            name: listing.owner?.firstName ? `${listing.owner.firstName} ${listing.owner.lastName}` : "Property Owner",
            avatar: listing.owner?.avatar || `https://ui-avatars.com/api/?name=${listing.owner?.firstName || 'O'}&background=random`,
            joined: listing.owner?.createdAt ? new Date(listing.owner.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Recently",
        },
        features: listing.features || []
    };

    const getImg = (index: number) => displayListing.images[index] || displayListing.images[0] || "/placeholder-property.svg";

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
                        <Image src={getImg(0)} alt="Property" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                    </div>
                    <div className="relative">
                        <Image src={getImg(1)} alt="Property" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                    </div>
                    <div className="relative">
                        <Image src={getImg(2)} alt="Property" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                    </div>
                    <div className="relative">
                        <Image src={getImg(3)} alt="Property" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                    </div>
                    <div className="relative">
                        <Image src={getImg(4)} alt="Property" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
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
                                {listing.features?.map((feature: string) => (
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
                                <div
                                    onClick={() => setIsBookingOpen(true)}
                                    className="p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors">Select Dates</div>
                                    <div className="flex items-center gap-2 font-bold">
                                        <Calendar className="w-4 h-4" />
                                        Choose available slot
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    size="lg"
                                    className="w-full h-14 text-lg rounded-2xl font-bold"
                                    onClick={() => setIsBookingOpen(true)}
                                >
                                    Request a viewing
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full h-14 text-lg rounded-2xl font-bold gap-2"
                                    onClick={() => setIsChatOpen(true)}
                                >
                                    <Mail className="w-5 h-5" /> Message Owner
                                </Button>
                            </div>

                            <div className="mt-8 pt-8 border-t flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                    <Image src={displayListing.owner.avatar} alt={displayListing.owner.name} fill sizes="48px" />
                                </div>
                                <div>
                                    <div className="font-bold leading-tight uppercase tracking-widest text-[10px] text-muted-foreground">Managed by</div>
                                    <div className="font-black text-lg">{displayListing.owner.name}</div>
                                    <div className="text-xs text-muted-foreground">Joined {displayListing.owner.joined}</div>
                                </div>
                            </div>

                            <p className="mt-6 text-[10px] text-center text-muted-foreground italic">
                                By clicking "Request a viewing", you agree to our terms of service and direct connection policy.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <BookingWizard
                listingId={id}
                isOpen={isBookingOpen}
                onClose={() => setIsBookingOpen(false)}
            />

            <ChatWindow
                listingId={id}
                ownerId={listing.ownerId}
                listingTitle={listing.title}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
            />
        </div>
    );
}
