/**
 * Root layout — wraps every page.
 * Provides the global background, font, Navbar, and toast notifications.
 */
import type { Metadata, Viewport } from "next";
import { Poppins, Dancing_Script, Anek_Gujarati, Playfair_Display } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Elegant cursive script for accent highlight words
const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dancing",
  display: "swap",
});

// Elegant editorial serif for hero headlines
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-playfair",
  display: "swap",
});

// Gujarati font — applied when Gujarati script is detected in content
const anekGujarati = Anek_Gujarati({
  subsets: ["gujarati"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-gujarati",
  display: "swap",
});
import Navbar from "@/components/Navbar";
import NavbarWrapper from "@/components/NavbarWrapper";
import MainWrapper from "@/components/MainWrapper";
import Footer from "@/components/Footer";
import FooterWrapper from "@/components/FooterWrapper";
import { ToasterProvider } from "@/components/ToasterProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UIDialogProvider } from "@/components/ui/UIDialogProvider";
import BottomNavWrapper from "@/components/BottomNavWrapper";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#1a1a1a" },
    { media: "(prefers-color-scheme: light)", color: "#fdfaf6" },
  ],
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Coachnest — Modern Learning Platform",
    template: "%s | Coachnest",
  },
  description:
    "Master new skills with expert-crafted courses. Interactive quizzes, progress tracking, and verified certificates — everything you need to level up your career.",
  keywords: [
    "online courses",
    "learn to code",
    "web development",
    "e-learning",
    "certificates",
    "programming tutorials",
    "Coachnest",
  ],
  authors: [{ name: "Coachnest" }],
  creator: "Coachnest",
  publisher: "Coachnest",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Coachnest",
    title: "Coachnest — Modern Learning Platform",
    description:
      "Master new skills with expert-crafted courses. Interactive quizzes, progress tracking, and verified certificates.",
    images: [
      {
        url: "/og-image.png",
        width: 1366,
        height: 654,
        alt: "Coachnest — Modern Learning Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coachnest — Modern Learning Platform",
    description:
      "Master new skills with expert-crafted courses. Interactive quizzes, progress tracking, and verified certificates.",
    images: ["/og-image.png"],
    creator: "@coachnest",
  },
  alternates: {
    canonical: BASE_URL,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Coachnest",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${dancingScript.variable} ${anekGujarati.variable} ${playfair.variable}`}>
      <head>
        {/* Preconnect to external CDNs for faster image loads */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1a1a1a" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        {/* Prevent flash of wrong theme — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('cn-theme')||'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.classList.add(r);})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <UIDialogProvider>
            <NavbarWrapper><Navbar /></NavbarWrapper>

            <MainWrapper>{children}</MainWrapper>

            <FooterWrapper><Footer /></FooterWrapper>

            {/* Global toast notifications */}
            <ToasterProvider />
            <BottomNavWrapper />
            <PWAInstallPrompt />
          </UIDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
