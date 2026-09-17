import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Startup Spark",
  description: "Student entrepreneur marketplace — University of Sri Jayewardenepura",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* CartProvider wraps the whole app so any page can read/update
            the cart — the cart itself lives in localStorage since
            customers don't have accounts (see architecture doc, Risk 1). */}
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
