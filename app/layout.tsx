/**
 * Root layout — wraps every page.
 * Provides the global background, font, Navbar, and toast notifications.
 */
import type { Metadata } from "next";
import { Poppins, Caveat, Anek_Gujarati, Mukta_Vaani, Hind_Vadodara, Baloo_Bhai_2 } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Aesthetic handwritten script for highlight words
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

// Gujarati fonts — loaded only when Gujarati script is detected in content
const anekGujarati = Anek_Gujarati({
  subsets: ["gujarati"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-gu-lesson",
  display: "swap",
});

const muktaVaani = Mukta_Vaani({
  subsets: ["gujarati"],
  weight: ["400", "600", "700"],
  variable: "--font-gu-para",
  display: "swap",
});

const hindVadodara = Hind_Vadodara({
  subsets: ["gujarati"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-gu-ui",
  display: "swap",
});

const balooBhai2 = Baloo_Bhai_2({
  subsets: ["gujarati"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-gu-heading",
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

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "CoachNest — Modern Learning Platform",
    template: "%s | CoachNest",
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
    "CoachNest",
  ],
  authors: [{ name: "CoachNest" }],
  creator: "CoachNest",
  publisher: "CoachNest",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "CoachNest",
    title: "CoachNest — Modern Learning Platform",
    description:
      "Master new skills with expert-crafted courses. Interactive quizzes, progress tracking, and verified certificates.",
    images: [
      {
        url: "/og-image.png",
        width: 1366,
        height: 654,
        alt: "CoachNest — Modern Learning Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CoachNest — Modern Learning Platform",
    description:
      "Master new skills with expert-crafted courses. Interactive quizzes, progress tracking, and verified certificates.",
    images: ["/og-image.png"],
    creator: "@coachnest",
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "any" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [{ url: "/icon.png", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${caveat.variable} ${anekGujarati.variable} ${muktaVaani.variable} ${hindVadodara.variable} ${balooBhai2.variable}`}>
      <head>
        {/* Preconnect to external CDNs for faster image loads */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
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
          </UIDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
