import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GRRS Admin Dashboard",
  description: "Gordon Ramsay Restaurant Reservation System dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}