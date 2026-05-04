"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { BookingCard } from "@/components/BookingCard";
import { PropertyCard } from "@/components/PropertyCard";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface Booking {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    property: {
        id: string;
        title: string;
        address: string;
        images: string[];
        price: number;
    };
    seeker?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

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

export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'bookings' | 'listings'>('bookings');

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (user.role === 'OWNER') {
                    // Fetch Listings
                    const listingsRes = await api.get('/properties/mine');
                    setListings(listingsRes.data);

                    // Fetch Incoming Bookings
                    const bookingsRes = await api.get(`/bookings/mine?role=OWNER`);
                    setBookings(bookingsRes.data);
                } else {
                    // Fetch My Bookings (Seeker)
                    const bookingsRes = await api.get(`/bookings/mine?role=SEEKER`);
                    setBookings(bookingsRes.data);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

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

    const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
        try {
            await api.patch(`/bookings/${bookingId}`, { status: newStatus, userId: user?.id });
            // Optimistic update
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update booking status");
        }
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

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 max-w-7xl mx-auto">
            <header className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">
                        Welcome back, {user.firstName}
                    </h1>
                    <p className="text-muted-foreground">
                        {user.role === 'OWNER'
                            ? "Manage your properties and viewing requests."
                            : "Track your viewing appointments and favorite homes."}
                    </p>
                </div>
                {user.role === 'OWNER' && (
                    <Link href="/properties/create">
                        <Button className="gap-2 rounded-full shadow-lg shadow-primary/20">
                            <Plus className="w-4 h-4" /> Add New Property
                        </Button>
                    </Link>
                )}
            </header>

            {user.role === 'OWNER' ? (
                <div className="space-y-8">
                    {/* Tabs (Simple implementation) */}
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('bookings')}
                            className={`pb-4 px-6 font-bold text-sm transition-colors relative ${activeTab === 'bookings' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Incoming Requests
                            {bookings.filter(b => b.status === 'PENDING').length > 0 && (
                                <span className="ml-2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {bookings.filter(b => b.status === 'PENDING').length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('listings')}
                            className={`pb-4 px-6 font-bold text-sm transition-colors relative ${activeTab === 'listings' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            My Properties
                            <span className="ml-2 bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                {listings.length}
                            </span>
                        </button>
                    </div>

                    {activeTab === 'bookings' && (
                        <div className="space-y-4">
                            {bookings.length === 0 ? (
                                <div className="text-center py-12 border rounded-2xl bg-muted/20">
                                    <p className="text-muted-foreground">No booking requests yet.</p>
                                </div>
                            ) : (
                                bookings.map(booking => (
                                    <BookingCard
                                        key={booking.id}
                                        booking={booking as any}
                                        role="OWNER"
                                        onStatusChange={handleStatusUpdate}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'listings' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {listings.length === 0 ? (
                                <div className="col-span-full text-center py-12 border rounded-2xl bg-muted/20">
                                    <p className="text-muted-foreground mb-4">You haven't listed any properties yet.</p>
                                    <Link href="/properties/create">
                                        <Button variant="outline">Create your first listing</Button>
                                    </Link>
                                </div>
                            ) : (
                                listings.map((listing) => {
                                    const firstImg = listing.images?.[0];
                                    const cover =
                                        listing.coverImageUrl ||
                                        (typeof firstImg === "object" && firstImg && "url" in firstImg
                                            ? firstImg.url
                                            : firstImg) ||
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
                                            />
                                            {isDraft && (
                                                <Button
                                                    type="button"
                                                    className="w-full rounded-xl font-bold"
                                                    onClick={() => void publishDraft(listing)}
                                                >
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
            ) : (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold">My Bookings</h2>
                    {bookings.length === 0 ? (
                        <div className="text-center py-12 border rounded-2xl bg-muted/20">
                            <p className="text-muted-foreground mb-4">You haven't made any bookings yet.</p>
                            <Link href="/search">
                                <Button variant="outline">Browse Homes</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {bookings.map(booking => (
                                <BookingCard
                                    key={booking.id}
                                    booking={booking as any}
                                    role="SEEKER"
                                    onStatusChange={handleStatusUpdate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
