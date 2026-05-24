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
    async function fetchFeatured() {
      try {
        const res = await api.get("/properties");
        setFeaturedListings(res.data.slice(0, 3));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
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
