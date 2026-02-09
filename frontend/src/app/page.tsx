import { Button } from "@/components/ui/Button";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const featuredListings = [
    {
      id: 1,
      title: "Modern Apartment in City Center",
      location: "New York, NY",
      price: "$2,500/mo",
      specs: "2 Beds • 1 Bath • 850 sqft",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 2,
      title: "Cozy Studio Near Park",
      location: "Brooklyn, NY",
      price: "$1,800/mo",
      specs: "Studio • 1 Bath • 500 sqft",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 3,
      title: "Luxury Penthouse Suite",
      location: "Manhattan, NY",
      price: "$8,500/mo",
      specs: "3 Beds • 3 Baths • 2200 sqft",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 4,
      title: "Suburban Family Home",
      location: "Queens, NY",
      price: "$3,200/mo",
      specs: "3 Beds • 2 Baths • 1500 sqft",
      image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"
    }
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80"
            alt="Hero Background"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-lg text-white">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 drop-shadow-md">
            Find your <span className="text-primary-foreground">ProperT</span>
          </h1>
          <p className="text-gray-100 text-lg mb-8 drop-shadow-sm">
            Connect directly with owners. No agents, no hassle.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/search">
              <Button size="lg" className="w-full sm:w-auto h-12 text-lg">Start Searching</Button>
            </Link>
            <Link href="/post">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 text-lg bg-transparent text-white border-white hover:bg-white/20 hover:text-white">Post Ad</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-12 px-4 md:px-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Featured Listings</h2>
          <Button variant="link">View all</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredListings.map((listing) => (
            <Link href={`/listings/${listing.id}`} key={listing.id} className="group relative rounded-xl border bg-card overflow-hidden shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="aspect-[4/3] relative bg-muted">
                <Image
                  src={listing.image}
                  alt={listing.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-2 py-1 rounded">
                  {listing.price}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate text-lg">{listing.title}</h3>
                <p className="text-sm text-muted-foreground truncate mb-2">{listing.location}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  {listing.specs}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
