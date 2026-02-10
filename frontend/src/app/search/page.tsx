"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ListingCard } from "@/components/ListingCard";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
        </div>
    ),
});

export default function SearchPage() {
    const searchParams = useSearchParams();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Default to NYC if no params
    const lat = parseFloat(searchParams.get("lat") || "40.7128");
    const lng = parseFloat(searchParams.get("lng") || "-74.0060");
    const radius = parseFloat(searchParams.get("radius") || "10");

    useEffect(() => {
        async function fetchListings() {
            setLoading(true);
            try {
                const res = await fetch(
                    `http://localhost:5000/listings/search?lat=${lat}&lng=${lng}&radius=${radius}`
                );
                if (!res.ok) throw new Error("Failed to fetch");
                const data = await res.json();
                setListings(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchListings();
    }, [lat, lng, radius]);

    return (
        <div className="min-h-screen pt-20 pb-8 px-4 max-w-[1600px] mx-auto">
            <div className="flex flex-col-reverse lg:flex-row gap-6 h-[calc(100vh-120px)]">

                {/* Left: Listings List */}
                <div className="w-full lg:w-3/5 xl:w-[55%] flex flex-col">
                    <header className="mb-6 flex items-baseline justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {listings.length} homes near you
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Within {radius}km of current location
                            </p>
                        </div>
                    </header>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <ListingCard key={i} id="" title="" address="" price={0} beds={0} baths={0} sqft={0} image="" isLoading />
                            ))}
                        </div>
                    ) : listings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 pb-4 no-scrollbar">
                            {listings.map((listing) => (
                                <ListingCard
                                    key={listing.id}
                                    id={listing.id}
                                    title={listing.title}
                                    address={listing.address}
                                    price={Number(listing.price)}
                                    beds={listing.originalBeds || 2} // Fallback if DB schema differs from UI
                                    baths={listing.originalBaths || 1}
                                    sqft={listing.size}
                                    image={listing.images[0] || "/placeholder.jpg"}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-2xl">
                            <MapPin className="w-10 h-10 text-muted-foreground mb-4" />
                            <h3 className="font-bold text-lg">No homes found</h3>
                            <p className="text-muted-foreground max-w-xs">
                                Try expanding your search radius or moving the map to a different area.
                            </p>
                        </div>
                    )}
                </div>

                {/* Right: Map */}
                <div className="w-full lg:w-2/5 xl:w-[45%] h-[400px] lg:h-full sticky top-24 rounded-2xl overflow-hidden shadow-xl border border-zinc-200/50">
                    <Map listings={listings} center={[lat, lng]} zoom={13} />
                </div>
            </div>
        </div>
    );
}
