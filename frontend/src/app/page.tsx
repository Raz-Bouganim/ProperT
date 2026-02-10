"use client";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import Image from "next/image";
import { ListingCard } from "@/components/ListingCard";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export default function Home() {
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const res = await api.get("/listings");
        // Just take the first 4 for featured
        setFeaturedListings(res.data.slice(0, 4));
      } catch (error) {
        console.error("Failed to fetch featured listings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 scale-105">
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80"
            alt="Hero Background"
            fill
            className="object-cover transition-all duration-1000"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-background" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-3xl text-white">
          <div className="inline-block px-3 py-1 mb-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wider uppercase">
            Transforming Real Estate
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Find your <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-foreground to-white">ProperT</span>
          </h1>
          <p className="text-gray-200 text-xl mb-10 max-w-2xl mx-auto font-medium">
            Discover unique homes and connect directly with owners.
            No middleman. No hidden fees. Just your future home.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/search">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-primary/30 transition-all">
                Search Properties
              </Button>
            </Link>
            <Link href="/post">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-white/5 backdrop-blur-sm text-white border-white/40 hover:bg-white hover:text-black transition-all">
                List Property
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-24 px-4 md:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-baseline justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Featured Listings</h2>
            <p className="text-muted-foreground text-lg">Hand-picked properties from our premium collection.</p>
          </div>
          <Link href="/search" className="text-primary font-bold hover:underline flex items-center gap-1 group">
            View all listings
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {loading ? (
            [1, 2, 3, 4].map(i => <ListingCard key={i} id="" title="" address="" price={0} beds={0} baths={0} sqft={0} image="" isLoading />)
          ) : featuredListings.length > 0 ? (
            featuredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                address={listing.address}
                price={Number(listing.price)}
                beds={listing.beds || 2}
                baths={listing.baths || 1}
                sqft={listing.size}
                image={listing.images[0] || "/placeholder.svg"}
              />
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground py-12">No properties listed yet.</p>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-32 p-12 rounded-[2rem] bg-zinc-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent z-0" />
          <div className="relative z-10 max-w-lg">
            <h3 className="text-3xl font-bold mb-4">Ready to sell or rent?</h3>
            <p className="text-zinc-400 text-lg mb-8">Join thousands of owners who saved on commissions by listing directly on ProperT.</p>
            <Button size="lg" className="rounded-full px-8 bg-white text-black hover:bg-zinc-200">Get Started Now</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
