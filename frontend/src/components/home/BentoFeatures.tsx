"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { PlayCircle, MessageSquare, Smartphone, Upload, Calendar, SlidersHorizontal } from "lucide-react";

const EASE = [0.4, 0, 0.2, 1] as [number, number, number, number];

export function BentoFeatures() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const show = (i: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 },
    transition: { delay: i * 0.08, duration: 0.55, ease: EASE },
  });

  return (
    <section ref={ref} className="py-24 px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-14">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          className="text-primary font-bold uppercase tracking-[0.22em] text-xs mb-3"
        >
          Why ProperT?
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ delay: 0.08, duration: 0.55, ease: EASE }}
          className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight"
        >
          Everything you need.
          <br />
          <span className="text-primary">Nothing you don&#39;t.</span>
        </motion.h2>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-12 gap-4 mb-4">

        {/* Virtual Tours — large dark card */}
        <motion.div
          {...show(0)}
          whileHover={{ scale: 1.01 }}
          className="col-span-12 md:col-span-7 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-[300px] group cursor-default"
        >
          <div className="absolute top-1/2 -translate-y-1/2 -right-8 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute right-8 bottom-8">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/20 group-hover:scale-125 transition-transform duration-500" />
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/40 group-hover:scale-110 transition-transform duration-300">
                <PlayCircle className="w-7 h-7 text-white ml-0.5" />
              </div>
            </div>
          </div>
          <div className="relative z-10 p-8 flex flex-col justify-end h-full">
            <div className="w-12 h-12 bg-primary/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/30 transition-colors">
              <PlayCircle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Immersive Virtual Tours</h3>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Explore every room in stunning 3D detail and HD video — all without leaving your couch.
            </p>
          </div>
        </motion.div>

        {/* Right column: Chat + Mobile stacked */}
        <div className="col-span-12 md:col-span-5 flex flex-col gap-4">

          {/* Instant Chat */}
          <motion.div
            {...show(1)}
            whileHover={{ scale: 1.02 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-7 flex-1 group cursor-default min-h-[140px]"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-1">Instant Owner Chat</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Direct messaging — no middlemen, no delays. Get answers fast.
                </p>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 opacity-25 group-hover:opacity-50 transition-opacity pointer-events-none">
              <div className="bg-primary rounded-2xl rounded-br-sm px-3 py-1.5 text-[10px] text-white font-medium self-end whitespace-nowrap">Is it still available?</div>
              <div className="bg-slate-200 rounded-2xl rounded-bl-sm px-3 py-1.5 text-[10px] text-slate-700 font-medium whitespace-nowrap">Yes! Want a tour?</div>
            </div>
          </motion.div>

          {/* No App Needed */}
          <motion.div
            {...show(2)}
            whileHover={{ scale: 1.02 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-7 flex-1 group cursor-default min-h-[140px]"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-1">No App Needed</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Lightning-fast on any mobile browser. Browse, tour, and chat anywhere.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-1 right-5 flex items-end gap-1 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
              {[20, 32, 44, 32].map((h, idx) => (
                <div key={idx} className="w-2 rounded-full bg-emerald-400" style={{ height: `${h}px` }} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom row — three equal cards */}
      <div className="grid grid-cols-12 gap-4">
        {([
          {
            icon: Upload,
            iconBg: "bg-violet-500",
            cardBg: "from-violet-50 to-purple-50 border-violet-100",
            title: "Easy Listing",
            desc: "Upload photos, add details, and go live in minutes.",
            rotate: "group-hover:rotate-3",
          },
          {
            icon: Calendar,
            iconBg: "bg-amber-500",
            cardBg: "from-amber-50 to-orange-50 border-amber-100",
            title: "1-Click Scheduling",
            desc: "Book a physical tour instantly with a single tap.",
            rotate: "group-hover:-rotate-3",
          },
          {
            icon: SlidersHorizontal,
            iconBg: "bg-rose-500",
            cardBg: "from-rose-50 to-pink-50 border-rose-100",
            title: "Advanced Search",
            desc: "Filter by location, price, type, and more to find your match.",
            rotate: "group-hover:rotate-3",
          },
        ] as const).map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              {...show(3 + i)}
              whileHover={{ scale: 1.02 }}
              className={`col-span-12 md:col-span-4 relative overflow-hidden rounded-3xl bg-gradient-to-br ${card.cardBg} border p-7 group cursor-default min-h-[130px]`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 ${card.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 ${card.rotate} transition-all duration-300`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">{card.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{card.desc}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
