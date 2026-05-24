"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Bed, Bath, Square, Calendar, MessageSquare, Heart, ArrowRight, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { toast } from "sonner";
import { coverImageUrl, type PropertyListingPreview } from "@/types/property-listing";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582407947304-fd86f28f4eed?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=800&q=80",
];

const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", ILS: "₪" };

function PremiumCard({
  listing,
  fallbackImage,
  index,
}: {
  listing: PropertyListingPreview;
  fallbackImage: string;
  index: number;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();

  const isOwner = !!listing.ownerId && listing.ownerId === user?.id;
  const favorited = isFavorited(listing.id);
  const href = `/properties/${listing.slug || listing.id}`;
  const imgSrc = coverImageUrl(listing, fallbackImage);
  const isRent = listing.status?.toLowerCase().includes("rent") || listing.status === "FOR_RENT";
  const currencySymbol = CURRENCY_SYMBOLS[listing.currency ?? "USD"] ?? "$";

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { toast.error("Please log in to save favorites"); return; }
    void toggleFavorite(listing.id);
  };

  const handleSchedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`${href}?book=true`);
  };

  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { router.push(`/auth?redirect=${encodeURIComponent(href)}`); return; }
    router.push(`/chat`);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.1, duration: 0.55, ease: "easeOut" }}
      className="group relative bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
    >
      {/* Image area */}
      <div
        className="relative aspect-[4/3] overflow-hidden cursor-pointer"
        onClick={() => router.push(href)}
      >
        <Image
          src={imgSrc}
          alt={listing.title || "Property"}
          fill
          className="object-cover group-hover:scale-107 transition-transform duration-700"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Status badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-800 shadow-sm z-10">
          {listing.status?.replace(/_/g, " ") ?? "For Sale"}
        </div>

        {/* Favorite button */}
        {!isOwner && (
          <button
            onClick={handleFavorite}
            className={cn(
              "absolute top-4 right-4 w-9 h-9 flex items-center justify-center backdrop-blur-md rounded-full transition-all shadow-sm z-10 cursor-pointer",
              favorited ? "bg-white text-red-500" : "bg-black/20 text-white hover:bg-white hover:text-red-500"
            )}
          >
            <Heart className={cn("w-4 h-4", favorited && "fill-red-500")} />
          </button>
        )}

        {/* Hover overlay with quick-action buttons */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-end p-4">
          <div className="flex gap-2 translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleSchedule}
              className="flex-1 bg-white text-slate-900 rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule Tour
            </button>
            <button
              onClick={handleChat}
              className="flex-1 bg-primary text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat Owner
            </button>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 cursor-pointer" onClick={() => router.push(href)}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-2xl font-bold text-primary">
            {currencySymbol}{Number(listing.price ?? 0).toLocaleString()}
            {isRent && <span className="text-sm font-semibold text-primary/70">/mo</span>}
          </h3>
        </div>

        <h4 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">
          {listing.title || "Premium Listing"}
        </h4>

        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{listing.addressLine ?? listing.address ?? "Location pending"}</span>
        </p>

        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-100">
          {listing.type !== "OFFICE" && (
            <>
              {!!listing.bedrooms && (
                <div className="flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold">{listing.bedrooms}</span>
                  <span className="text-[10px] text-slate-500 uppercase font-medium">Beds</span>
                </div>
              )}
              {!!listing.bathrooms && (
                <div className="flex items-center gap-1.5">
                  <Bath className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold">{listing.bathrooms}</span>
                  <span className="text-[10px] text-slate-500 uppercase font-medium">Baths</span>
                </div>
              )}
            </>
          )}
          {!!(listing.sqft ?? listing.size) && (
            <div className="flex items-center gap-1.5">
              <Square className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold">{(listing.sqft ?? listing.size ?? 0).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 uppercase font-medium">sqft</span>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

interface FeaturedSectionProps {
  listings: PropertyListingPreview[];
  loading: boolean;
  isAuthenticated: boolean;
}

export function FeaturedSection({ listings, loading, isAuthenticated }: FeaturedSectionProps) {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-14">
          <div>
            <p className="text-primary font-bold uppercase tracking-[0.22em] text-xs mb-3">Featured</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Handpicked properties
            </h2>
            <p className="text-slate-500 text-lg mt-2 font-medium">
              Explore some of the most exclusive listings available today.
            </p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-2 text-primary font-black text-base hover:gap-3 transition-all group whitespace-nowrap mb-1"
          >
            View All
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-7 bg-slate-100 rounded-xl w-1/3" />
                  <div className="h-4 bg-slate-100 rounded-xl w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-xl w-1/2" />
                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <div className="h-4 bg-slate-100 rounded-xl w-14" />
                    <div className="h-4 bg-slate-100 rounded-xl w-14" />
                    <div className="h-4 bg-slate-100 rounded-xl w-14" />
                  </div>
                </div>
              </div>
            ))
          ) : listings.length > 0 ? (
            listings.map((listing, index) => (
              <PremiumCard
                key={listing.id || index}
                listing={listing}
                fallbackImage={FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}
                index={index}
              />
            ))
          ) : (
            <div className="col-span-full py-24 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <HomeIcon className="text-slate-300 w-8 h-8" />
              </div>
              <p className="text-slate-400 text-xl font-bold mb-8">No properties listed yet.</p>
              <Link href={isAuthenticated ? "/properties/create" : "/auth?redirect=/properties/create"}>
                <Button size="lg" className="rounded-xl h-14 px-10 text-lg font-black shadow-xl shadow-primary/20 cursor-pointer">
                  Be the first to list!
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
