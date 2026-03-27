/**
 * Root layout — wraps every page.
 * Provides the global background, font, Navbar, and toast notifications.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ToasterProvider } from "@/components/ToasterProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LearnHub — Modern Learning Platform",
  description:
    "Master new skills with expert-crafted courses. Learn at your own pace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Preconnect to external CDNs for faster image loads */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Decorative background blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        </div>

        <Navbar />

        {/* Push content below the fixed navbar */}
        <main className="pt-24 min-h-screen">{children}</main>

        {/* Global toast notifications */}
        <ToasterProvider />
      </body>
    </html>
  );
}
