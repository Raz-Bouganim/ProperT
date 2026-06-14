"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import api from "@/lib/api";
import { type PropertyListingPreview } from "@/types/property-listing";
import { BookingCard, type BookingCardBooking } from "@/components/BookingCard";
import { PropertyCard } from "@/components/PropertyCard";
import type { LucideIcon } from "lucide-react";
import {
    Loader2, Plus, CalendarCheck, Heart, BellRing, Building2, Home, ArrowRight, X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { BOOKING_STATUS_STYLES } from "@/lib/booking-status";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type TabConfig = {
    id: ActiveTab;
    label: string;
    icon: LucideIcon;
    badge: number;
    badgeHighlight?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────


function isBookingPatch(v: unknown): v is Partial<BookingCardBooking> & { id: string } {
    return typeof v === "object" && v !== null && "id" in v && typeof (v as Record<string, unknown>).id === "string";
}

// ── Animation variants ────────────────────────────────────────────────────────

const pageEnter: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, ease: "easeOut" },
    },
};

const slideDown: Variants = {
    hidden: { opacity: 0, y: -14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};

const cardListVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const cardItem: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
    icon: Icon,
    title,
    subtitle,
    cta,
}: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    cta?: { label: string; href: string };
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-border text-center"
        >
            <Icon className="w-6 h-6 text-muted-foreground mb-3" />
            <p className="text-sm font-bold text-foreground mb-1">{title}</p>
            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">{subtitle}</p>
            {cta && (
                <Link href={cta.href} className="mt-5">
                    <Button variant="outline" className="rounded-full gap-1.5 text-xs font-bold h-8 px-4">
                        {cta.label} <ArrowRight className="w-3 h-3" />
                    </Button>
                </Link>
            )}
        </motion.div>
    );
}

// ── Property bookings drawer ──────────────────────────────────────────────────

function PropertyBookingsDrawer({
    property,
    bookings,
    onClose,
}: {
    property: Listing;
    bookings: BookingCardBooking[];
    onClose: () => void;
}) {
    return (
        <>
            <motion.div
                key="drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
                onClick={onClose}
            />
            <motion.div
                key="drawer-panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", bounce: 0.08, duration: 0.38 }}
                className="fixed inset-y-0 right-0 z-50 w-[420px] max-w-full bg-background border-l border-border shadow-2xl flex flex-col"
            >
                <div className="flex items-start gap-3 px-5 pt-6 pb-4 border-b border-border/60 shrink-0">
                    <div className="flex-grow min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1.5">
                            Property Bookings
                        </p>
                        <h3 className="font-black text-lg leading-tight line-clamp-2 text-foreground">
                            {property.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            {property.addressLine ?? property.address ?? ""}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 mt-0.5 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-2.5 border-b border-border/40 bg-muted/30 shrink-0">
                    <span className="text-[11px] font-bold text-muted-foreground">
                        {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {bookings.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                            No bookings yet
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {bookings.map((b) => {
                                const bStyle = BOOKING_STATUS_STYLES[b.status] ?? BOOKING_STATUS_STYLES["CANCELLED"];
                                return (
                                    <div key={b.id} className="flex items-stretch gap-4 px-5 py-4">
                                        <div className={cn("w-[3px] rounded-full shrink-0 self-stretch", bStyle.bar)} />
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm font-black text-foreground">
                                                {format(new Date(b.startTime), "EEE, MMM d")}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {format(new Date(b.startTime), "h:mm a")}
                                                {" – "}
                                                {format(new Date(b.endTime), "h:mm a")}
                                            </p>
                                            {b.seeker && (
                                                <p className="text-xs font-semibold text-foreground/70 mt-1">
                                                    {b.seeker.firstName} {b.seeker.lastName}
                                                </p>
                                            )}
                                        </div>
                                        <span className={cn(
                                            "self-start shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full",
                                            bStyle.badge,
                                        )}>
                                            {b.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { favorites: favoriteIds, initialized: favoritesInitialized } = useFavorites();
    const [seekerBookings, setSeekerBookings]     = useState<BookingCardBooking[]>([]);
    const [ownerBookings,  setOwnerBookings]      = useState<BookingCardBooking[]>([]);
    const [listings,       setListings]           = useState<Listing[]>([]);
    const [favoriteProperties, setFavoriteProperties] = useState<PropertyListingPreview[]>([]);
    const [loading,        setLoading]            = useState(true);
    const [activeTab,      setActiveTab]          = useState<ActiveTab>("myBookings");
    const [selectedProperty, setSelectedProperty] = useState<Listing | null>(null);

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
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
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
        if (!isBookingPatch(updated)) return;
        setSeekerBookings((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    };

    const handleOwnerBookingPatched = (updated: unknown) => {
        if (!isBookingPatch(updated)) return;
        setOwnerBookings((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    };

    const pendingOwnerCount = useMemo(
        () => ownerBookings.filter((b) => b.status === "PENDING").length,
        [ownerBookings],
    );

    const bookingsByProperty = useMemo(() => {
        const map = new Map<string, BookingCardBooking[]>();
        for (const b of ownerBookings) {
            const existing = map.get(b.property.id) ?? [];
            existing.push(b);
            map.set(b.property.id, existing);
        }
        return map;
    }, [ownerBookings]);

    const tabs = useMemo((): TabConfig[] => [
        { id: "myBookings",    label: "My Bookings",        icon: CalendarCheck, badge: seekerBookings.length },
        ...(isOwner
            ? [{ id: "incoming" as ActiveTab, label: "Incoming Bookings", icon: BellRing, badge: pendingOwnerCount, badgeHighlight: pendingOwnerCount > 0 }]
            : []),
        ...(isOwner
            ? [{ id: "myProperties" as ActiveTab, label: "My Properties", icon: Building2, badge: listings.length }]
            : []),
        { id: "savedHomes",    label: "Saved",              icon: Heart,         badge: favoriteProperties.length },
    ], [isOwner, seekerBookings.length, pendingOwnerCount, favoriteProperties.length, listings.length]);

    // ── Loading ───────────────────────────────────────────────────────────────

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    // ── Unauthenticated ───────────────────────────────────────────────────────

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Home className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight mb-1.5">Sign in to continue</h2>
                    <p className="text-muted-foreground text-sm mb-5">
                        View your bookings, saved homes, and listings.
                    </p>
                    <Link href="/login">
                        <Button className="rounded-full">Log In</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="min-h-screen bg-background"
            variants={pageEnter}
            initial="hidden"
            animate="visible"
        >
            <motion.div
                variants={slideDown}
                className="pt-16 bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent border-b border-border/40"
            >
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/70 leading-none mb-1.5">
                            Your Dashboard
                        </p>
                        <h1 className="text-2xl font-black tracking-tight leading-none text-foreground">
                            Welcome back, {user.firstName}
                        </h1>
                    </div>
                    {isOwner && (
                        <Link href="/properties/create">
                            <Button className="gap-1.5 rounded-full font-bold text-xs h-8 px-3.5 shadow-sm">
                                <Plus className="w-3 h-3" />
                                New Listing
                            </Button>
                        </Link>
                    )}
                </div>
            </motion.div>

            <motion.div
                variants={slideDown}
                className="sticky top-16 z-40 border-b border-border/60 bg-background/95 backdrop-blur-sm" /* top-16 matches navbar height */
            >
                <div className="max-w-7xl mx-auto px-6 flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="relative flex-1 flex items-center justify-center gap-2 py-3.5 overflow-hidden group"
                        >
                            {/* Sliding background + top accent bar */}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="tab-active-bg"
                                    className="absolute inset-0 bg-primary/[0.05]"
                                    transition={{ type: "spring", bounce: 0.12, duration: 0.38 }}
                                >
                                    <div className="absolute top-0 inset-x-0 h-[2px] bg-primary" />
                                </motion.div>
                            )}
                            <tab.icon
                                className={cn(
                                    "relative z-10 w-[15px] h-[15px] flex-shrink-0 transition-colors",
                                    activeTab === tab.id
                                        ? "text-primary"
                                        : "text-muted-foreground group-hover:text-foreground",
                                )}
                            />
                            <span
                                className={cn(
                                    "relative z-10 text-[13px] font-bold transition-colors whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "text-foreground"
                                        : "text-muted-foreground group-hover:text-foreground",
                                )}
                            >
                                {tab.label}
                            </span>
                            {tab.badge > 0 && (
                                <span
                                    className={cn(
                                        "relative z-10 text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none transition-colors",
                                        tab.badgeHighlight
                                            ? "bg-destructive text-destructive-foreground"
                                            : activeTab === tab.id
                                                ? "bg-primary/10 text-primary"
                                                : "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </motion.div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {/* My Bookings */}
                        {activeTab === "myBookings" && (
                            seekerBookings.length === 0 ? (
                                <EmptyState
                                    icon={CalendarCheck}
                                    title="No bookings yet"
                                    subtitle="Browse available properties and book a viewing to get started."
                                    cta={{ label: "Browse Properties", href: "/search" }}
                                />
                            ) : (
                                <motion.div
                                    className="space-y-3"
                                    variants={cardListVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {seekerBookings.map((booking) => (
                                        <motion.div key={booking.id} variants={cardItem}>
                                            <BookingCard
                                                booking={booking}
                                                role="SEEKER"
                                                onPatched={handleSeekerBookingPatched}
                                            />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )
                        )}

                        {/* Saved Homes */}
                        {activeTab === "savedHomes" && (
                            favoriteProperties.length === 0 ? (
                                <EmptyState
                                    icon={Heart}
                                    title="No saved homes yet"
                                    subtitle="Tap the heart on any listing to save it here for later."
                                    cta={{ label: "Browse Properties", href: "/search" }}
                                />
                            ) : (
                                <motion.div
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                                    variants={cardListVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {favoriteProperties.map((p) => {
                                        const firstImg = p.images?.[0];
                                        const cover =
                                            p.coverImageUrl ||
                                            (typeof firstImg === "object" && firstImg && "url" in firstImg
                                                ? firstImg.url
                                                : firstImg) ||
                                            "/placeholder-property.svg";
                                        return (
                                            <motion.div key={p.id} variants={cardItem}>
                                                <PropertyCard
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
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )
                        )}

                        {/* Incoming Bookings (owner) */}
                        {activeTab === "incoming" && isOwner && (
                            ownerBookings.length === 0 ? (
                                <EmptyState
                                    icon={BellRing}
                                    title="No requests yet"
                                    subtitle="Booking requests from prospective tenants will appear here once your listings are live."
                                />
                            ) : (
                                <motion.div
                                    className="space-y-3"
                                    variants={cardListVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {ownerBookings.map((booking) => (
                                        <motion.div key={booking.id} variants={cardItem}>
                                            <BookingCard
                                                booking={booking}
                                                role="OWNER"
                                                onPatched={handleOwnerBookingPatched}
                                            />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )
                        )}

                        {/* My Properties (owner) */}
                        {activeTab === "myProperties" && isOwner && (
                            listings.length === 0 ? (
                                <EmptyState
                                    icon={Building2}
                                    title="No listings yet"
                                    subtitle="Create your first property listing to start receiving viewing requests."
                                    cta={{ label: "Create a Listing", href: "/properties/create" }}
                                />
                            ) : (
                                <motion.div
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                                    variants={cardListVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {listings.map((listing) => {
                                        const firstImg = listing.images?.[0];
                                        const cover =
                                            listing.coverImageUrl ||
                                            (typeof firstImg === "object" && firstImg && "url" in firstImg
                                                ? firstImg.url
                                                : firstImg) ||
                                            "/placeholder-property.svg";
                                        const isDraft = !listing.publishedAt;
                                        const propertyBookings = bookingsByProperty.get(listing.id) ?? [];
                                        return (
                                            <motion.div key={listing.id} variants={cardItem} className="flex flex-col gap-2">
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
                                                    <Button
                                                        type="button"
                                                        className="w-full rounded-xl font-bold text-xs h-9"
                                                        onClick={() => void publishDraft(listing)}
                                                    >
                                                        Publish Listing
                                                    </Button>
                                                )}
                                                {propertyBookings.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedProperty(listing)}
                                                        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-1"
                                                    >
                                                        <CalendarCheck className="w-3.5 h-3.5 text-primary/60" />
                                                        <span>{propertyBookings.length} booking{propertyBookings.length !== 1 ? "s" : ""}</span>
                                                    </button>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Property bookings drawer */}
            <AnimatePresence>
                {selectedProperty && (
                    <PropertyBookingsDrawer
                        key="property-drawer"
                        property={selectedProperty}
                        bookings={bookingsByProperty.get(selectedProperty.id) ?? []}
                        onClose={() => setSelectedProperty(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
