"use client";

import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full overflow-hidden bg-white">
      {/* Left Content Column (55%) */}
      <div className="flex w-full flex-col justify-center px-12 py-20 lg:w-[55%]">
        <div className="max-w-xl space-y-8">
          {/* Main Heading in Figtree (Black Text) */}
          <h1 className="font-heading text-6xl font-bold tracking-tight text-slate-950 leading-[1.1]">
            Manage <br />
            Right Now, <br />
            Everywhere.
          </h1>

         
          <p className="font-sans text-lg text-slate-600 leading-relaxed">
            Welcome to your restaurant command center that turns chaotic bookings into 
            a seamless dining experience. Monitor, adjust, and optimize your 
            service without losing control.
          </p>

          
          <ul className="space-y-4 font-sans text-[13px] text-slate-700">
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-slate-950" />
              <span>Real-time floor plan & table control</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-slate-950" />
              <span>Automated reservation & deposit syncing</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-slate-950" />
              <span>Instant menu, pricing, & stock updates</span>
            </li>
          </ul>

          
          <div className="flex items-center gap-4 pt-6">
            <Button asChild className="h-12 bg-slate-950 px-8 text-white hover:bg-slate-800 font-heading font-bold rounded-lg transition-all shadow-md">
              <Link href="/admin/dashboard">Proceed to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 border-slate-200 bg-slate-50 px-8 text-slate-950 hover:bg-slate-100 font-heading rounded-lg">
              <Link href="/admin/reservations">Manage Reservations</Link>
            </Button>
          </div>
        </div>
      </div>

      
      <div className="relative hidden w-[45%] lg:flex items-center justify-center bg-slate-50 p-12">
        <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-2xl border border-slate-200">

          <img 
            src="/admin/main-img.jpg" 
            alt="Dashboard Preview" 
            className="h-full w-full object-cover"
          />
          
          {/* Subtle overlay for depth */}
          <div className="absolute inset-0 bg-slate-950/5 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};