"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, MapPin, Home as HomeIcon, ArrowRight } from "lucide-react";

interface HeroSectionProps {
  isAuthenticated: boolean;
}

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"buy" | "rent">("buy");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("All Types");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (propertyType !== "All Types") params.set("type", propertyType);
    if (mode === "rent") params.set("status", "FOR_RENT");
    router.push(`/search?${params.toString()}`);
  };

  return (
    <section className="relative h-[100svh] min-h-[700px] w-full overflow-hidden flex flex-col items-center justify-center pb-16">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80"
          alt="Modern luxury home"
          fill
          className="object-cover scale-[1.04]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/75" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center text-center">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-6 inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/90 text-sm font-semibold tracking-wide">500+ Properties Live Now</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1 }}
          className="text-white text-5xl md:text-[4.5rem] font-black leading-[1.04] tracking-tight mb-5"
        >
          Find Your Perfect
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300">
            Dream Home
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.2 }}
          className="text-white/65 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
        >
          Virtual tours, instant owner chat, and 1-click tour scheduling.
          The future of real estate is here.
        </motion.p>

        {/* Glassmorphism search card */}
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.28 }}
          className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-2.5 shadow-2xl"
        >
          {/* Buy / Rent toggle */}
          <div className="flex gap-1 mb-2.5 px-1.5 pt-0.5">
            {(["buy", "rent"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                  mode === m
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {m === "buy" ? "Buy" : "Rent"}
              </button>
            ))}
          </div>

          {/* Fields row */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5">
              <MapPin className="text-primary w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col items-start w-full">
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-[0.18em]">Location</span>
                <input
                  className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 placeholder:text-slate-400 w-full outline-none"
                  placeholder="City or neighborhood..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 md:min-w-[180px]">
              <HomeIcon className="text-primary w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col items-start w-full">
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-[0.18em]">Type</span>
                <select
                  className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 w-full outline-none appearance-none cursor-pointer"
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

            <button
              onClick={handleSearch}
              className="bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl px-8 py-3.5 flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.55 }}
          className="flex items-center divide-x divide-white/20 mt-10 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10"
        >
          {[
            { value: "500+", label: "Active Listings" },
            { value: "1-Click", label: "Tour Booking" },
            { value: "Instant", label: "Owner Chat" },
          ].map((stat) => (
            <div key={stat.label} className="px-8 py-4 text-center">
              <div className="text-white font-black text-xl">{stat.value}</div>
              <div className="text-white/50 text-xs font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">Scroll</span>
        <motion.div
          className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent"
          animate={{ scaleY: [0, 1, 0], originY: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* List CTA (top-right overlay) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9 }}
        className="absolute top-8 right-8 hidden md:block"
      >
        <Link
          href={isAuthenticated ? "/properties/create" : "/auth?redirect=/properties/create"}
          className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-white/20 transition-all"
        >
          List Your Property
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </section>
  );
}
