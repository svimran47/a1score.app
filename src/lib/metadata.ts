import type { Metadata } from "next";
import { headers } from "next/headers";
import { SITE_URL, getCanonicalUrl } from "@/lib/siteUrl";

export { SITE_URL, getCanonicalUrl };

/**
 * Returns the effective base URL for metadata, canonicals, and sitemaps.
 * On *.pages.dev preview hosts, dynamically resolves to the request host so
 * canonicals and OG links remain self-consistent without pointing to production.
 */
export function getEffectiveSiteUrl(): string {
  try {
    const headersList = headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    if (host && host.includes("pages.dev")) {
      const proto = headersList.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // Outside request context (e.g. build phase / static analysis)
  }
  return SITE_URL;
}

/**
 * Ensures title format unifies to "Page | a1score" (no domain in titles) and avoids duplicate suffixes.
 */
export function formatTitle(title: string): string {
  const trimmed = title.trim();
  // Strip any trailing "| a1score", "| a1score.app", or variants
  const cleanTitle = trimmed
    .replace(/\s*\|\s*a1score\.app$/i, "")
    .replace(/\s*\|\s*a1score$/i, "")
    .trim();
  return `${cleanTitle} | a1score`;
}

export interface MetadataOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[] | string;
  type?: "website" | "article" | "profile";
}

const DEFAULT_KEYWORDS = [
  "football market values",
  "player valuations",
  "transfer market",
  "football live scores",
  "squad market value",
  "football analytics",
  "transfer news",
  "live football lineups",
  "football transfers",
  "a1score",
];

/**
 * Unified metadata helper enforcing consistent titles, canonicals, og:url, keywords, and robots.
 */
export function constructMetadata({
  title,
  description,
  path = "",
  image,
  noIndex = false,
  keywords = DEFAULT_KEYWORDS,
  type = "website",
}: MetadataOptions): Metadata {
  const baseUrl = getEffectiveSiteUrl();
  const fullTitle = formatTitle(title);
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  const canonicalUrl = `${baseUrl}${cleanPath}`;
  const ogImage = image
    ? image.startsWith("http://") || image.startsWith("https://")
      ? image
      : `${baseUrl}${image.startsWith("/") ? image : `/${image}`}`
    : `${baseUrl}/og-default.png`;

  return {
    title: fullTitle,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: "a1score",
      images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }],
      type,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
      creator: "@a1score",
      site: "@a1score",
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
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
  };
}
