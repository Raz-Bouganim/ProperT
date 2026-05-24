"use client";

import Link from "next/link";
import {
  Building2, Trees, Briefcase, Crown, Home, Warehouse, Coffee, MapPin,
} from "lucide-react";

const categories = [
  { label: "Villas", icon: Trees, type: "HOUSE" },
  { label: "Apartments", icon: Building2, type: "APARTMENT" },
  { label: "Penthouses", icon: Crown, type: "APARTMENT" },
  { label: "Offices", icon: Briefcase, type: "OFFICE" },
  { label: "Houses", icon: Home, type: "HOUSE" },
  { label: "Warehouses", icon: Warehouse, type: "OFFICE" },
  { label: "Studios", icon: Coffee, type: "APARTMENT" },
  { label: "Townhouses", icon: MapPin, type: "HOUSE" },
];

/* Duplicate the list so the infinite scroll has content to loop over */
const doubled = [...categories, ...categories];

export function CategoryMarquee() {
  return (
    <section className="py-10 bg-white border-y border-slate-100 overflow-hidden">
      <div className="flex items-center gap-4 mb-7 px-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.22em] whitespace-nowrap">
          Browse by Category
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* Marquee track — width 200% so the duplicated half is off-screen */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="flex gap-3 animate-marquee w-max">
          {doubled.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <Link
                key={i}
                href={`/search?type=${cat.type}`}
                className="flex items-center gap-2.5 px-6 py-3 bg-slate-50 hover:bg-primary hover:text-white border border-slate-200 hover:border-primary rounded-full font-bold text-sm text-slate-700 transition-all duration-200 whitespace-nowrap flex-shrink-0 group shadow-sm hover:shadow-lg hover:shadow-primary/20"
              >
                <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
