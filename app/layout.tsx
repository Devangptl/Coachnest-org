/**
 * Root layout — wraps every page.
 * Provides the global background, font, Navbar, and toast notifications.
 */
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
import Navbar from "@/components/Navbar";
import NavbarWrapper from "@/components/NavbarWrapper";
import MainWrapper from "@/components/MainWrapper";
import Footer from "@/components/Footer";
import FooterWrapper from "@/components/FooterWrapper";
import { ToasterProvider } from "@/components/ToasterProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning className={poppins.variable}>
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
      <body className="antialiased">
        <ThemeProvider>
          <NavbarWrapper><Navbar /></NavbarWrapper>

          <MainWrapper>{children}</MainWrapper>

          <FooterWrapper><Footer /></FooterWrapper>

          {/* Global toast notifications */}
          <ToasterProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
