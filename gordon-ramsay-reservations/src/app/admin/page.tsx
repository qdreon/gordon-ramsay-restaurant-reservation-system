"use client";

import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default function AdminHomePage() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full overflow-hidden rounded-3xl border border-white/10 bg-black/20 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      {/* Left Content Column (55%) */}
      <div className="flex w-full flex-col justify-center px-6 py-14 sm:px-10 lg:w-[55%] lg:px-12 lg:py-20">
        <div className="max-w-xl space-y-8">
          {/* Main Heading in Figtree (Black Text) */}
          <h1 className="font-heading text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
            Manage <br />
            Right Now, <br />
            Everywhere.
          </h1>

         
          <p className="font-sans text-lg leading-relaxed text-zinc-300">
            Welcome to your restaurant command center that turns chaotic bookings into 
            a seamless dining experience. Monitor, adjust, and optimize your 
            service without losing control.
          </p>

          
          <ul className="space-y-4 font-sans text-[13px] text-zinc-200">
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-amber-300" />
              <span>Real-time floor plan & table control</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-amber-300" />
              <span>Automated reservation & deposit syncing</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-amber-300" />
              <span>Instant menu, pricing, & stock updates</span>
            </li>
          </ul>

          
          <div className="flex items-center gap-4 pt-6">
            <Button asChild className="h-12 rounded-lg bg-amber-400 px-8 font-heading font-bold text-black shadow-md transition-all hover:bg-amber-300">
              <Link href="/admin/dashboard">Proceed to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-lg border-white/20 bg-white/10 px-8 font-heading text-white hover:bg-white/20">
              <Link href="/admin/reservations">Manage Reservations</Link>
            </Button>
          </div>
        </div>
      </div>

      
      <div className="relative hidden w-[45%] items-center justify-center bg-black/10 p-12 lg:flex">
        <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl">

          <Image
            src="/admin/main-img.jpg"
            alt="Dashboard Preview"
            fill
            className="h-full w-full object-cover"
          />
          
          {/* Subtle overlay for depth */}
          <div className="absolute inset-0 bg-slate-950/5 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
