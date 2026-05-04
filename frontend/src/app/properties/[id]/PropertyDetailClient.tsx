"use client";

import { Suspense, use, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Bed, Bath, Square, MapPin, Share2, Heart, LandPlot, Mail, Calendar, Loader2, Images } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { BookingWizard } from "@/components/BookingWizard";
import { ChatWindow } from "@/components/ChatWindow";
import { LightboxGallery } from "@/components/listing/LightboxGallery";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PROPERTY_TYPES } from "@/app/properties/create/constants/propertyTypes";
import { AMENITIES } from "@/app/properties/create/constants/amenities";
import { Footer } from "@/components/layout/Footer";
import { toast } from "sonner";

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
        </div>
    ),
});

function PropertyDetailInner({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const { user } = useAuth();
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const searchParams = useSearchParams();

    const { returnHref, returnLabel } = useMemo(() => {
        const from = searchParams.get("from");
        const returnTo = searchParams.get("returnTo");

        if (from === "home") {
            return { returnHref: returnTo || "/", returnLabel: "Return to home" };
        }

        if (from === "search") {
            return { returnHref: returnTo || "/search", returnLabel: "Return to search" };
        }

        return { returnHref: returnTo || "/search", returnLabel: "Return to search" };
    }, [searchParams]);

    useEffect(() => {
        // Ensure initial render starts at the top (avoid retained scroll position from previous route/state).
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [id]);

    useEffect(() => {
        if (!property || loading) return;
        const draft = !property.publishedAt;
        let meta = document.querySelector('meta[name="robots"]');
        if (draft) {
            if (!meta) {
                meta = document.createElement("meta");
                meta.setAttribute("name", "robots");
                document.head.appendChild(meta);
            }
            meta.setAttribute("content", "noindex,nofollow");
        } else if (meta) {
            meta.setAttribute("content", "index,follow");
        }
    }, [property, loading]);

    const amenityById = Object.fromEntries(AMENITIES.map((a) => [a.id, a]));

    /** Map API `AmenityType` (e.g. SWIMMING_POOL) or kebab id → `AMENITIES` id. */
    const toAmenityListId = (raw: string) => {
        const key = String(raw ?? "").toUpperCase().replace(/-/g, "_");
        if (key === "WASHER_DRYER") return "laundry";
        return String(raw ?? "")
            .toLowerCase()
            .replace(/_/g, "-");
    };

    const formatAmenityLabel = (raw: string) =>
        String(raw ?? "")
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, (m) => m.toUpperCase());

    const getCurrencySymbol = (currencyCode?: string) => {
        const symbols: Record<string, string> = {
            USD: "$",
            EUR: "€",
            GBP: "£",
            ILS: "₪",
        };
        return symbols[String(currencyCode ?? "").toUpperCase()] || "$";
    };

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const res = await api.get(`/properties/${id}`);
                setProperty(res.data);
            } catch (error) {
                console.error("Failed to fetch property:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperty();
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

    if (!property) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 text-center">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Property not found</h2>
                    <p className="text-muted-foreground mb-6">The property you're looking for doesn't exist or has been removed.</p>
                    <Link href={returnHref}>
                        <Button variant="outline">{returnLabel}</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const lineAddress = [property.addressLine, property.address].find(Boolean) as string | undefined;
    const formattedFullAddress = [lineAddress, property.city, property.region, property.postalCode, property.country]
        .filter(Boolean)
        .join(", ");

    const displayProperty = {
        ...property,
        images: (property.images && property.images.length > 0)
            ? property.images.map((img: any) => img.url ?? img)
            : ["/placeholder-property.svg"],
        owner: {
            name: property.owner?.firstName ? `${property.owner.firstName} ${property.owner.lastName}` : "Property Owner",
            avatar: property.owner?.avatar || `https://ui-avatars.com/api/?name=${property.owner?.firstName || 'O'}&background=random`,
            published: property.publishedAt
                ? new Date(property.publishedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : property.createdAt
                  ? new Date(property.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                  : "Recently",
            listingStarted: property.createdAt
                ? new Date(property.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : null,
        },
        features: (property.amenities ?? property.features ?? []).map((f: any) => f.amenity ?? f.feature ?? f),
    };

    const getImg = (index: number) => displayProperty.images[index] || displayProperty.images[0] || "/placeholder-property.svg";
    const propertyTypeOption = PROPERTY_TYPES.find((t) => t.id === property.type);
    const PropertyTypeIcon = propertyTypeOption?.icon ?? LandPlot;
    const propertyTypeLabel = propertyTypeOption?.label ?? (property.type ? String(property.type).replace(/_/g, " ") : "—");
    const listingStatus = String(property.status ?? "").toUpperCase();
    const isRent = listingStatus === "FOR_RENT" || listingStatus.includes("RENT");
    const statusLabel = listingStatus ? listingStatus.replace(/_/g, " ") : "—";
    const statusBadgeLabel = statusLabel
        .toLowerCase()
        .replace(/\b\w/g, (m) => m.toUpperCase());
    const formatHalfSteps = (value: unknown) => {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) return "0";
        return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
    };

    const isOffice = String(property.type ?? "").toUpperCase() === "OFFICE";
    const isDraftListing = !property.publishedAt;

    const handleShare = async () => {
        const path = `/properties/${property.slug || property.id}`;
        const url = `${window.location.origin}${path}${window.location.search}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied", { description: "Canonical listing URL is in your clipboard." });
        } catch {
            toast.error("Could not copy", { description: url });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Action Bar */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href={returnHref} className="text-sm font-medium hover:underline text-muted-foreground flex items-center gap-2">
                        <span>←</span> {returnLabel}
                    </Link>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-2 rounded-full"
                            onClick={() => void handleShare()}
                        >
                            <Share2 className="w-4 h-4" /> Share
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                            <Heart className="w-4 h-4" /> Save
                        </Button>
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-7xl mx-auto px-4 py-8">
                {isDraftListing && (
                    <div
                        className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 text-sm font-medium"
                        role="status"
                    >
                        This listing is a draft. It does not appear in search or featured listings until you publish it
                        from your dashboard.
                    </div>
                )}
                <header className="mb-8">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">{property.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{formattedFullAddress}</span>
                        </div>
                    </div>
                </header>

                {/* Masonry Gallery */}
                <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[500px] mb-12 rounded-2xl overflow-hidden">
                    <div className="col-span-2 row-span-2 relative">
                        <button
                            type="button"
                            className="absolute inset-0"
                            aria-label="Open photo gallery"
                            onClick={() => { setGalleryIndex(0); setIsGalleryOpen(true); }}
                        >
                            <Image src={getImg(0)} alt="Property" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                        </button>
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            className="absolute inset-0"
                            aria-label="Open photo gallery"
                            onClick={() => { setGalleryIndex(1); setIsGalleryOpen(true); }}
                        >
                            <Image src={getImg(1)} alt="Property" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                        </button>
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            className="absolute inset-0"
                            aria-label="Open photo gallery"
                            onClick={() => { setGalleryIndex(2); setIsGalleryOpen(true); }}
                        >
                            <Image src={getImg(2)} alt="Property" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                        </button>
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            className="absolute inset-0"
                            aria-label="Open photo gallery"
                            onClick={() => { setGalleryIndex(3); setIsGalleryOpen(true); }}
                        >
                            <Image src={getImg(3)} alt="Property" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer" />
                        </button>
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            className="absolute inset-0"
                            aria-label="Open photo gallery"
                            onClick={() => { setGalleryIndex(4); setIsGalleryOpen(true); }}
                        >
                            <Image
                                src={getImg(4)}
                                alt="Property"
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer"
                            />
                        </button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setGalleryIndex(0); setIsGalleryOpen(true); }}
                            className="absolute bottom-3 right-3 z-10 rounded-lg bg-white/95 text-slate-900 border-white/60 shadow-md backdrop-blur gap-2 cursor-pointer transition-all duration-200 hover:bg-white hover:border-white/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/30"
                            aria-label="View all photos"
                        >
                            <Images className="w-4 h-4" />
                            View all photos
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <div
                            className={[
                                "grid gap-y-6 gap-x-6 px-2 sm:px-8 py-6 border-b border-t mb-8 sm:items-center sm:gap-x-0 sm:justify-items-center",
                                isOffice ? "grid-cols-2 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
                            ].join(" ")}
                        >
                            {!isOffice && (
                                <>
                                    <div className="flex items-center gap-3 sm:justify-center">
                                        <Bed className="w-7 h-7 text-primary" />
                                        <div className="flex flex-col leading-tight">
                                            <span className="font-bold text-lg">{formatHalfSteps(property.bedrooms ?? 0)}</span>
                                            <span className="text-xs text-muted-foreground uppercase tracking-widest">Beds</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 sm:justify-center">
                                        <Bath className="w-7 h-7 text-primary" />
                                        <div className="flex flex-col leading-tight">
                                            <span className="font-bold text-lg">{formatHalfSteps(property.bathrooms ?? 0)}</span>
                                            <span className="text-xs text-muted-foreground uppercase tracking-widest">Baths</span>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="flex items-center gap-3 sm:justify-center">
                                <Square className="w-7 h-7 text-primary" />
                                <div className="flex flex-col leading-tight">
                                    <span className="font-bold text-lg">{Number(property.sqft ?? 0).toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Sqft</span>
                                </div>
                            </div>
                            <div
                                className={[
                                    "flex items-center gap-3 sm:justify-center",
                                    isOffice ? "justify-self-end sm:col-start-2" : "justify-self-end sm:justify-center sm:justify-self-center",
                                ].join(" ")}
                            >
                                <PropertyTypeIcon className="w-7 h-7 text-primary" />
                                <div className="flex flex-col leading-tight">
                                    <span className="font-bold text-sm">{propertyTypeLabel}</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Type</span>
                                </div>
                            </div>
                        </div>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold mb-4">About this home</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                                {property.description}
                            </p>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-2xl font-bold mb-6">Amenities</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {(displayProperty.features ?? []).map((feature: string) => {
                                    const listId = toAmenityListId(feature);
                                    const amenity = amenityById[listId as keyof typeof amenityById] as
                                        | (typeof AMENITIES)[number]
                                        | undefined;
                                    const label = amenity?.label ?? formatAmenityLabel(feature);
                                    const icon = amenity?.icon ?? "check_circle";

                                    return (
                                        <div
                                            key={feature}
                                            className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            <div className="h-10 w-10 rounded-xl border bg-muted/40 flex items-center justify-center text-primary flex-shrink-0">
                                                <span className="material-icons-outlined text-[20px] leading-none">{icon}</span>
                                            </div>
                                            <span className="font-semibold text-sm text-foreground">{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="mb-0">
                            <h2 className="text-2xl font-bold mb-6">Location</h2>
                            <div className="aspect-video relative rounded-2xl bg-muted overflow-hidden">
                                {property.latitude && property.longitude ? (
                                    <Map
                                        className="rounded-none"
                                        listings={[{
                                            id: property.id ?? "property",
                                            latitude: Number(property.latitude),
                                            longitude: Number(property.longitude),
                                        }]}
                                        center={[Number(property.latitude), Number(property.longitude)]}
                                        zoom={15}
                                        isInteractive={false}
                                        isNavigable={true}
                                        allowMarkerClick={false}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground italic">
                                        Location map unavailable
                                    </div>
                                )}
                            </div>
                            <p className="mt-4 text-muted-foreground flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" /> {formattedFullAddress}
                            </p>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 p-8 rounded-3xl border shadow-xl bg-card">
                            <div className="flex items-baseline justify-between mb-8">
                                <div>
                                    <span className="text-3xl font-black">
                                        {getCurrencySymbol(property.currency)}{Number(property.price ?? 0).toLocaleString()}
                                    </span>
                                    {isRent && <span className="text-muted-foreground font-medium ml-1">/ mo</span>}
                                    {isRent && (property.leaseDurationLabel || property.leaseDuration) && (
                                        <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {String(property.leaseDurationLabel ?? property.leaseDuration)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isRent && property.availableFrom && (
                                <p className="text-sm text-muted-foreground mb-4">
                                    Available from{" "}
                                    <span className="font-bold text-foreground">
                                        {new Date(property.availableFrom).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </span>
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2 mb-8">
                                <span className="px-3 py-1 rounded-full border bg-muted/40 text-[11px] font-black tracking-widest text-foreground/80">
                                    {statusBadgeLabel}
                                </span>
                                <span
                                    className={[
                                        "px-3 py-1 rounded-full border text-[11px] font-black tracking-widest",
                                        property.negotiable
                                            ? "bg-primary/10 border-primary/20 text-primary"
                                            : "bg-muted/40 text-foreground/70",
                                    ].join(" ")}
                                >
                                    {property.negotiable ? "Negotiable" : "Fixed price"}
                                </span>
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
                                    className="w-full h-14 text-lg rounded-2xl font-bold cursor-pointer"
                                    onClick={() => setIsBookingOpen(true)}
                                >
                                    Request a viewing
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full h-14 text-lg rounded-2xl font-bold gap-2 cursor-pointer"
                                    onClick={() => setIsChatOpen(true)}
                                >
                                    <Mail className="w-5 h-5" /> Message Owner
                                </Button>
                            </div>

                            <div className="mt-8 pt-8 border-t flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                    <Image src={displayProperty.owner.avatar} alt={displayProperty.owner.name} fill sizes="48px" />
                                </div>
                                <div>
                                    <div className="font-bold leading-tight uppercase tracking-widest text-[10px] text-muted-foreground">Managed by</div>
                                    <div className="font-black text-lg">{displayProperty.owner.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Published {displayProperty.owner.published}
                                        {displayProperty.owner.listingStarted && (
                                            <span className="block text-[10px] mt-1 text-muted-foreground/80">
                                                Created {displayProperty.owner.listingStarted}
                                            </span>
                                        )}
                                    </div>
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
                propertyId={property.id}
                isOpen={isBookingOpen}
                onClose={() => setIsBookingOpen(false)}
            />

            <ChatWindow
                propertyId={property.id}
                ownerId={property.ownerId}
                propertyTitle={property.title}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
            />

            <LightboxGallery
                images={displayProperty.images}
                address={formattedFullAddress}
                isOpen={isGalleryOpen}
                initialIndex={galleryIndex}
                onClose={() => setIsGalleryOpen(false)}
            />

            <Footer />
        </div>
    );
}

export default function PropertyDetailClient({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        }>
            <PropertyDetailInner params={params} />
        </Suspense>
    );
}
