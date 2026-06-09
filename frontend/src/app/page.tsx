"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Footer } from "@/components/layout/Footer";
import api from "@/lib/api";
import { type PropertyListingPreview } from "@/types/property-listing";
import { HeroSection } from "@/components/home/HeroSection";
import { BentoFeatures } from "@/components/home/BentoFeatures";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FeaturedSection } from "@/components/home/FeaturedSection";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [featuredListings, setFeaturedListings] = useState<PropertyListingPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fetch immediately — don't wait for geo permission check
    api
      .get("/properties/featured")
      .then((res) => { if (!cancelled) setFeaturedListings(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    // If geo was already granted, silently refetch with coords (no permission prompt)
    (async () => {
      if (typeof navigator === "undefined" || !navigator.permissions) return;
      const perm = await navigator.permissions.query({ name: "geolocation" });
      if (perm.state !== "granted") return;
      const coords = await new Promise<GeolocationCoordinates | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          () => resolve(null),
          { timeout: 3000 },
        );
      });
      if (!coords || cancelled) return;
      const res = await api.get("/properties/featured", {
        params: { lat: coords.latitude, lng: coords.longitude },
      });
      if (!cancelled) setFeaturedListings(res.data);
    })().catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <HeroSection isAuthenticated={isAuthenticated} />
      <BentoFeatures />
      <HowItWorks />
      <FeaturedSection listings={featuredListings} loading={loading} isAuthenticated={isAuthenticated} />
      <Footer />
    </div>
  );
}
