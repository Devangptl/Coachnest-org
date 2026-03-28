/**
 * Root layout — wraps every page.
 * Provides the global background, font, Navbar, and toast notifications.
 */
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ToasterProvider } from "@/components/ToasterProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CoachNest — Modern Learning Platform",
  description:
    "Master new skills with expert-crafted courses. Learn at your own pace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external CDNs for faster image loads */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* Prevent flash of wrong theme — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('cn-theme')||'dark';document.documentElement.classList.add(t);})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {/* Subtle background glow */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/[.07] rounded-full blur-3xl" />
            <div className="absolute top-1/3 -right-40 w-80 h-80 bg-orange-500/[.04] rounded-full blur-3xl" />
            <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-600/[.04] rounded-full blur-3xl" />
          </div>

          <Navbar />

          {/* Push content below the fixed navbar */}
          <main className="pt-24 min-h-screen">{children}</main>

          {/* Global toast notifications */}
          <ToasterProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
