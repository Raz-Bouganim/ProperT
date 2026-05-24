"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { UserPlus, Search, PlayCircle, CalendarCheck, KeyRound } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Account",
    desc: "Sign up free in under 60 seconds.",
    color: "bg-primary",
    light: "bg-primary/10 text-primary",
  },
  {
    number: "02",
    icon: Search,
    title: "Browse & Filter",
    desc: "Search by location, type, price, and explore results on an interactive map.",
    color: "bg-violet-500",
    light: "bg-violet-100 text-violet-600",
  },
  {
    number: "03",
    icon: PlayCircle,
    title: "Virtual Tour",
    desc: "Explore the property remotely with an immersive 3D walkthrough.",
    color: "bg-emerald-500",
    light: "bg-emerald-100 text-emerald-600",
  },
  {
    number: "04",
    icon: CalendarCheck,
    title: "Chat & Schedule",
    desc: "Message the owner directly and book a physical visit in one click.",
    color: "bg-amber-500",
    light: "bg-amber-100 text-amber-600",
  },
  {
    number: "05",
    icon: KeyRound,
    title: "Move In",
    desc: "Finalize the deal and get your keys. Welcome home.",
    color: "bg-rose-500",
    light: "bg-rose-100 text-rose-600",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            className="text-primary font-bold uppercase tracking-[0.22em] text-xs mb-3"
          >
            How It Works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.08 }}
            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight"
          >
            From search to keys — in minutes
          </motion.h2>
        </div>

        {/* Steps grid */}
        <div className="relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 32 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.1, duration: 0.55, ease: "easeOut" }}
                  className="flex flex-col items-center text-center group"
                >
                  {/* Circle with icon */}
                  <div className="relative mb-6">
                    <div className={`w-20 h-20 rounded-2xl ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    {/* Step number badge */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-slate-300 flex items-center justify-center">
                      <span className="text-[9px] font-black text-slate-500">{step.number}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mb-2 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed max-w-[180px]">
                    {step.desc}
                  </p>

                  {/* Mobile connector */}
                  {i < steps.length - 1 && (
                    <div className="md:hidden w-px h-8 bg-slate-300 mt-6 mx-auto" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
