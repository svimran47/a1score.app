import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/metadata";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

// Variable font with both axes: weight for hierarchy, width for the condensed
// heading/figure voice (see --stretch-heading / --stretch-figure in tokens.css).
// Only latin is preloaded; the generated @font-face rules still include
// latin-ext, fetched on demand for names such as Modrić, Šeško or Aktürkoğlu.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "a1score — Money meets the pitch",
    template: "%s",
  },
  description:
    "Football platform combining match fixtures and scores with player market valuation updates and club records.",
  keywords: [
    "football market values",
    "player valuations",
    "transfer market",
    "live football scores",
    "squad market value",
    "football analytics",
    "transfer news",
    "live football lineups",
    "football transfers",
    "soccer valuations",
    "a1score",
  ],
  authors: [{ name: "a1score", url: SITE_URL }],
  creator: "a1score",
  publisher: "a1score",
  applicationName: "a1score",
  category: "sports",
  classification: "Football Analytics and Market Values",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "a1score",
    title: "a1score — Money meets the pitch",
    description:
      "Football platform: match scores, player market valuation updates, and club records.",
    images: [
      {
        url: `${SITE_URL}/og-default.png`,
        width: 1200,
        height: 630,
        alt: "a1score — Money meets the pitch",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "a1score — Money meets the pitch",
    description:
      "Football platform: match scores, player market valuation updates, and club records.",
    images: [`${SITE_URL}/og-default.png`],
    creator: "@a1score",
    site: "@a1score",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    types: {
      "application/rss+xml": `${SITE_URL}/feed.xml`,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "QSMFfmlwS2jeM9E-RsjdN94YHPpTGdoL2gu_6NH-Hg0",
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION
        ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION }
        : {}),
      ...(process.env.NEXT_PUBLIC_BAIDU_VERIFICATION
        ? { "baidu-site-verification": process.env.NEXT_PUBLIC_BAIDU_VERIFICATION }
        : {}),
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "a1score",
  },
};

import { GridKeyNavigation } from "@/components/GridKeyNavigation";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PostFollowNotificationPrompt } from "@/components/notifications/PostFollowNotificationPrompt";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { ConsentBanner } from "@/components/privacy/ConsentBanner";
import { AppShell } from "@/components/AppShell";
import { AccountSync } from "@/components/auth/AccountSync";
import { CapacitorBridge } from "@/components/mobile/CapacitorBridge";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} dark`} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link rel="alternate" type="application/rss+xml" title="a1score RSS Feed" href={`${SITE_URL}/feed.xml`} />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased transition-colors duration-200" style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
        <CapacitorBridge />
        <AnalyticsProvider />
        <ConsentBanner />
        <ServiceWorkerRegister />
        <GridKeyNavigation />
        <PostFollowNotificationPrompt />
        <AccountSync />
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
