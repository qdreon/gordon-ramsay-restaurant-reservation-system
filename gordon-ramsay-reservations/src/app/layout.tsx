import type { Metadata } from 'next';
import './globals.css';
import { Geist, Figtree } from "next/font/google";
import { cn } from "@/lib/utils";

// 1. Initialize Geist for standard body text
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans'
});

// 2. Initialize Figtree for headers and titles
const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-heading'
});

export const metadata: Metadata = {
  title: 'Gordon Ramsay Restaurant Reservations',
  description: 'Restaurant reservation and availability management system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased font-sans", geist.variable, figtree.variable)}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
