"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  MapPin,
  Home as HomeIcon,
  Banknote,
  PlayCircle,
  MessageSquare,
  Smartphone,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PropertyCard } from "@/components/PropertyCard";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Footer } from "@/components/layout/Footer";
import { coverImageUrl, type PropertyListingPreview } from "@/types/property-listing";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [featuredListings, setFeaturedListings] = useState<PropertyListingPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState("");
  const [propertyType, setPropertyType] = useState("All Types");
  const [priceRange, setPriceRange] = useState("Select budget");

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const res = await api.get("/properties");
        // Just take the first 3 for featured to match the 3-column grid design
        setFeaturedListings(res.data.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch featured listings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  const handleSearch = () => {
    // Redirect to search page with params
    const params = new URLSearchParams();
    if (searchLocation) params.append("location", searchLocation);
    if (propertyType !== "All Types") params.append("type", propertyType.toUpperCase());
    // Simple price parsing for demo
    if (priceRange !== "Select budget") params.append("priceRange", priceRange);

    window.location.href = `/search?${params.toString()}`;
  };

  // Real-looking fallback images from home.html
  const fallbackImages = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD8TF_c0MlrjG3nNZ4FXHxsPdXi3RjDogn_V9RG4eLRotaFxWVvWLW5CNdOc_mfN1KHTg8rUXPV-CBerIg2FbhzgTxuW5Snj93g4u6dtZlRkmYJNtqrk1NNCcWGIjLRqUrKvAO3n0LgoaPjuLlMpyo10-sI61pIULHSHsqUt5rZ4wCtPAJH0zQVnCvAA6CGs3lGrz4pABjAadKNFQjHhpQJ6by0LBkFRuCP3R0KHWQAvWZmyfeo8r0EHnWnM4BOAP8C2YmDfcMVHuA",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA0O4LvSAbELuWZjsR6tzTtg0f9_-6ZmxJuzYRcLeYvl5s3B8afKcKV76BiKbSyopv6tCkV6h802t14RvkPOUgj3cxUGOSPaP8dUfmqHeQnFNZZceyCot3EJQYVpNZP5bItOQ8RebIHw09Q_q7jsfDPPy04OLqMIDpoS_S-sKHGDMT2S76dhwSjXPqMnbiH0q9o0LJg9UFIij1faOUDRg5iqIAEdhvC33CyNZ2N0GA6qMopRAnFcJLnUb_HsZ8JyavIBWkbKfGWsoY",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC1qiCcdRh86RSV-lc5EZ50jRXK-QIk9n1ghPGUB_5Qm1HkOoSUiZF1HJPqMfDtOlihntV2hSduTiWeM49H_GhGMrgbK9gvRJQJ9j85CIkX7OoMNQhmaFfp_tWD8uy-FsuXsk52eLfKBoweDgiip_6BqEs9VdtwCTOj02BxCyKfF52YRRLLQiZX8Hl5y9xj2JmS0Ui0zzxZIKMy21JSunukQCn6-fvchuf42HccLG7KBaj0-JJ_1AwbdqHxQnxjFrfl5NCPjyY2pCE"
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative h-[75vh] min-h-[600px] w-full overflow-hidden flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80"
            alt="Modern luxury house"
            fill
            className="object-cover transition-all duration-1000 scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col items-center text-center">
          <h1 className="text-white text-4xl md:text-6xl font-black leading-[1.1] tracking-tight mb-6 max-w-4xl drop-shadow-2xl">
            Your Next Property, <br />
            <span className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-xl text-white inline-block mt-2 border border-white/20 transition-transform hover:scale-105 cursor-default">
              Found Effortlessly.
            </span>
          </h1>
          <p className="text-slate-200 text-base md:text-lg font-medium max-w-2xl mb-10 drop-shadow-lg leading-relaxed">
            Media-rich, mobile-first, and direct owner-to-seeker communication. The future of real estate is here.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Button
              onClick={handleSearch}
              className="bg-primary text-white h-14 px-8 rounded-xl text-lg font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-all cursor-pointer"
            >
              Start Searching
            </Button>
            <Link href={isAuthenticated ? "/properties/create" : "/auth?redirect=/properties/create"}>
              <Button
                variant="outline"
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white h-14 px-8 rounded-xl text-lg font-bold hover:bg-white/20 transition-all cursor-pointer"
              >
                List Your Property
              </Button>
            </Link>
          </div>

          {/* Sleek Search Bar */}
          <div className="w-full max-w-5xl bg-white/95 backdrop-blur-2xl p-3 md:p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 border border-white/50">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Location */}
              <div className="flex items-center gap-3 px-4 py-3 border-b md:border-b-0 md:border-r border-slate-200 group cursor-text">
                <MapPin className="text-primary w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-start w-full text-left">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Location</span>
                  <input
                    className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 placeholder:text-slate-400 w-full cursor-text"
                    placeholder="Enter city or neighborhood"
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                </div>
              </div>
              {/* Property Type */}
              <div className="flex items-center gap-3 px-4 py-3 border-b md:border-b-0 md:border-r border-slate-200 group cursor-pointer">
                <HomeIcon className="text-primary w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-start w-full text-left">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Property Type</span>
                  <select
                    className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 w-full cursor-pointer appearance-none"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                  >
                    <option>All Types</option>
                    <option value="HOUSE">House</option>
                    <option value="APARTMENT">Apartment</option>
                    <option value="OFFICE">Office</option>
                  </select>
                </div>
              </div>
              {/* Price Range */}
              <div className="flex items-center gap-3 px-4 py-3 group cursor-pointer">
                <Banknote className="text-primary w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-start w-full text-left">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Price Range</span>
                  <select
                    className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 w-full cursor-pointer appearance-none"
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                  >
                    <option>Select budget</option>
                    <option>$100k - $300k</option>
                    <option>$300k - $700k</option>
                    <option>$700k+</option>
                  </select>
                </div>
              </div>
            </div>
            <Button
              onClick={handleSearch}
              className="bg-primary text-white h-14 md:h-auto md:px-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span>Search</span>
            </Button>
          </div>
        </div>
      </section >

      {/* Value Proposition Section */}
      < section className="py-20 px-6 max-w-7xl mx-auto" >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Why ProperT?</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed font-medium">
            Experience the future of real estate searching with our cutting-edge features designed for modern lives.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Media-First Experience",
              desc: "High-quality video tours, 3D walkthroughs, and stunning galleries for every single listing on our platform.",
              icon: <PlayCircle className="text-primary w-10 h-10" />
            },
            {
              title: "Direct Communication",
              desc: "Integrated instant chat for direct connections between owners and seekers. No middlemen, no delays.",
              icon: <MessageSquare className="text-primary w-10 h-10" />
            },
            {
              title: "No App Needed",
              desc: "Seamlessly accessible from any mobile browser with a lightning-fast interface. Browse anywhere, anytime.",
              icon: <Smartphone className="text-primary w-10 h-10" />
            }
          ].map((feature, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-left transition-all hover:shadow-xl hover:-translate-y-2">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-8">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed font-medium text-base">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section >

      {/* Featured Properties Section */}
      < section className="py-20 bg-slate-50/50 border-y border-slate-200" >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-16">
            <div className="text-left">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Featured Properties</h2>
              <p className="text-slate-500 text-lg leading-relaxed font-medium">Explore some of the most exclusive properties available today.</p>
            </div>
            <Link href="/search" className="text-primary font-black text-lg flex items-center gap-2 hover:gap-4 transition-all group cursor-pointer mb-2">
              View All Properties
              <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => <PropertyCard key={i} id="" title="" address="" price={0} beds={0} baths={0} sqft={0} image="" isLoading />)
            ) : featuredListings.length > 0 ? (
              featuredListings.map((listing, index) => (
                <PropertyCard
                  key={listing.id || index}
                  id={listing.id || ""}
                  detailsHref={`/properties/${listing.slug || listing.id || ""}?from=home&returnTo=${encodeURIComponent("/")}`}
                  title={listing.title || "Premium Listing"}
                  address={listing.addressLine ?? listing.address ?? "Location pending"}
                  price={Number(listing.price) || 0}
                  beds={listing.bedrooms || 2}
                  baths={listing.bathrooms || 1}
                  sqft={listing.sqft ?? listing.size ?? 0}
                  image={coverImageUrl(listing, fallbackImages[index % 3])}
                  isFeatured
                  type={listing.type || "For Sale"}
                  status={listing.status}
                  currency={listing.currency || "USD"}
                  leaseDuration={listing.leaseDuration}
                  leaseDurationLabel={listing.leaseDurationLabel}
                  hideBedBath={listing.type === "OFFICE"}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <HomeIcon className="text-slate-300 w-8 h-8" />
                </div>
                <p className="text-slate-400 text-xl font-bold mb-8 tracking-tight">No properties listed yet.</p>
                <Link href={isAuthenticated ? "/properties/create" : "/auth?redirect=/properties/create"}>
                  <Button size="lg" className="rounded-xl h-14 px-10 text-lg font-black shadow-xl shadow-primary/20 cursor-pointer">
                    Be the first to list!
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section >

      <Footer />
    </div >
  );
}
