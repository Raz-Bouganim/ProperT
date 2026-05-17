"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import api from "@/lib/api";
import { type PropertyListingPreview } from "@/types/property-listing";
import { BookingCard, type BookingCardBooking } from "@/components/BookingCard";
import { PropertyCard } from "@/components/PropertyCard";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface Listing {
    id: string;
    slug?: string;
    title: string;
    addressLine?: string;
    address?: string;
    price: number;
    size: number;
    sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    coverImageUrl?: string | null;
    images: Array<string | { url: string }>;
    status?: string;
    publishedAt?: string | null;
    type?: string;
}

type ActiveTab = "myBookings" | "savedHomes" | "incoming" | "myProperties";

export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { favorites: favoriteIds, initialized: favoritesInitialized } = useFavorites();
    const [seekerBookings, setSeekerBookings] = useState<BookingCardBooking[]>([]);
    const [ownerBookings, setOwnerBookings] = useState<BookingCardBooking[]>([]);
    const [listings, setListings] = useState<Listing[]>([]);
    const [favoriteProperties, setFavoriteProperties] = useState<PropertyListingPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>("myBookings");

    const isOwner = listings.length > 0;

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [seekerRes, favRes, listingsRes] = await Promise.all([
                    api.get("/bookings/mine?role=SEEKER"),
                    api.get("/favorites"),
                    api.get("/properties/mine"),
                ]);
                setSeekerBookings(seekerRes.data);
                setFavoriteProperties(favRes.data);
                setListings(listingsRes.data);

                if ((listingsRes.data as Listing[]).length > 0) {
                    const ownerRes = await api.get("/bookings/mine?role=OWNER");
                    setOwnerBookings(ownerRes.data);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    useEffect(() => {
        if (!favoritesInitialized) return;
        setFavoriteProperties((prev) => prev.filter((p) => favoriteIds.has(p.id)));
    }, [favoriteIds, favoritesInitialized]);

    const publishDraft = async (listing: Listing) => {
        try {
            await api.patch(`/properties/${listing.id}`, { publish: true });
            toast.success("Listing published.");
            const listingsRes = await api.get("/properties/mine");
            setListings(listingsRes.data);
        } catch (error: unknown) {
            const msg =
                error && typeof error === "object" && "response" in error
                    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(typeof msg === "string" ? msg : "Could not publish. Add missing details (e.g. available-from for rentals) and try again.");
        }
    };

    const handleSeekerBookingPatched = (updated: unknown) => {
        const b = updated as Partial<BookingCardBooking> & { id: string };
        if (b?.id) setSeekerBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...b } : x)));
    };

    const handleOwnerBookingPatched = (updated: unknown) => {
        const b = updated as Partial<BookingCardBooking> & { id: string };
        if (b?.id) setOwnerBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...b } : x)));
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Please log in to view your dashboard</h2>
                    <Link href="/login">
                        <Button>Log In</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const pendingOwnerCount = ownerBookings.filter((b) => b.status === "PENDING").length;

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 max-w-7xl mx-auto">
            <header className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">
                        Welcome back, {user.firstName}
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your bookings, properties, and saved homes.
                    </p>
                </div>
                <Link href="/properties/create">
                    <Button className="gap-2 rounded-full shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4" /> Add Property
                    </Button>
                </Link>
            </header>

            <div className="space-y-8">
                <div className="flex border-b overflow-x-auto">
                    <TabButton id="myBookings" label="My Bookings" badge={seekerBookings.length} active={activeTab === "myBookings"} onClick={setActiveTab} />
                    <TabButton id="savedHomes" label="Saved Homes" badge={favoriteProperties.length} active={activeTab === "savedHomes"} onClick={setActiveTab} />
                    {isOwner && (
                        <>
                            <TabButton id="incoming" label="Incoming Requests" badge={pendingOwnerCount} badgeHighlight={pendingOwnerCount > 0} active={activeTab === "incoming"} onClick={setActiveTab} />
                            <TabButton id="myProperties" label="My Properties" badge={listings.length} active={activeTab === "myProperties"} onClick={setActiveTab} />
                        </>
                    )}
                </div>

                {activeTab === "myBookings" && (
                    <div className="space-y-4">
                        {seekerBookings.length === 0 ? (
                            <div className="text-center py-12 border rounded-2xl bg-muted/20">
                                <p className="text-muted-foreground mb-4">You haven&apos;t made any bookings yet.</p>
                                <Link href="/search">
                                    <Button variant="outline">Browse Homes</Button>
                                </Link>
                            </div>
                        ) : (
                            seekerBookings.map((booking) => (
                                <BookingCard key={booking.id} booking={booking} role="SEEKER" onPatched={handleSeekerBookingPatched} />
                            ))
                        )}
                    </div>
                )}

                {activeTab === "savedHomes" && (
                    <div>
                        {favoriteProperties.length === 0 ? (
                            <div className="text-center py-12 border rounded-2xl bg-muted/20">
                                <p className="text-muted-foreground mb-4">You haven&apos;t saved any homes yet.</p>
                                <Link href="/search">
                                    <Button variant="outline">Browse Homes →</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {favoriteProperties.map((p) => {
                                    const firstImg = p.images?.[0];
                                    const cover =
                                        p.coverImageUrl ||
                                        (typeof firstImg === "object" && firstImg && "url" in firstImg ? firstImg.url : firstImg) ||
                                        "/placeholder-property.svg";
                                    return (
                                        <PropertyCard
                                            key={p.id}
                                            id={p.id}
                                            detailsHref={`/properties/${p.slug || p.id}`}
                                            title={p.title ?? ""}
                                            address={p.addressLine ?? p.address ?? ""}
                                            price={Number(p.price)}
                                            beds={p.bedrooms ?? 0}
                                            baths={p.bathrooms ?? 0}
                                            sqft={p.sqft ?? p.size ?? 0}
                                            image={cover as string}
                                            status={p.status}
                                            leaseDurationLabel={p.leaseDurationLabel ?? undefined}
                                            hideBedBath={p.type === "OFFICE"}
                                            currency={p.currency}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "incoming" && isOwner && (
                    <div className="space-y-4">
                        {ownerBookings.length === 0 ? (
                            <div className="text-center py-12 border rounded-2xl bg-muted/20">
                                <p className="text-muted-foreground">No booking requests yet.</p>
                            </div>
                        ) : (
                            ownerBookings.map((booking) => (
                                <BookingCard key={booking.id} booking={booking} role="OWNER" onPatched={handleOwnerBookingPatched} />
                            ))
                        )}
                    </div>
                )}

                {activeTab === "myProperties" && isOwner && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings.length === 0 ? (
                            <div className="col-span-full text-center py-12 border rounded-2xl bg-muted/20">
                                <p className="text-muted-foreground mb-4">You haven&apos;t listed any properties yet.</p>
                                <Link href="/properties/create">
                                    <Button variant="outline">Create your first listing</Button>
                                </Link>
                            </div>
                        ) : (
                            listings.map((listing) => {
                                const firstImg = listing.images?.[0];
                                const cover =
                                    listing.coverImageUrl ||
                                    (typeof firstImg === "object" && firstImg && "url" in firstImg ? firstImg.url : firstImg) ||
                                    "/placeholder-property.svg";
                                const isDraft = !listing.publishedAt;
                                return (
                                    <div key={listing.id} className="flex flex-col gap-3">
                                        <PropertyCard
                                            id={listing.id}
                                            detailsHref={`/properties/${listing.slug || listing.id}`}
                                            title={listing.title}
                                            address={listing.addressLine ?? listing.address ?? ""}
                                            price={Number(listing.price)}
                                            beds={listing.bedrooms ?? 0}
                                            baths={listing.bathrooms ?? 0}
                                            sqft={listing.sqft ?? listing.size ?? 0}
                                            image={cover}
                                            status={listing.status}
                                            hideBedBath={listing.type === "OFFICE"}
                                            ownerId={user.id}
                                        />
                                        {isDraft && (
                                            <Button type="button" className="w-full rounded-xl font-bold" onClick={() => void publishDraft(listing)}>
                                                Publish listing
                                            </Button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TabButton({
    id,
    label,
    badge,
    badgeHighlight = false,
    active,
    onClick,
}: {
    id: ActiveTab;
    label: string;
    badge?: number;
    badgeHighlight?: boolean;
    active: boolean;
    onClick: (id: ActiveTab) => void;
}) {
    return (
        <button
            onClick={() => onClick(id)}
            className={`pb-4 px-6 font-bold text-sm transition-colors relative whitespace-nowrap ${active ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
            {label}
            {badge !== undefined && (
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${badgeHighlight ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    {badge}
                </span>
            )}
        </button>
    );
}
