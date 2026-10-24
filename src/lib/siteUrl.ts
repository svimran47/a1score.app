/**
 * src/lib/siteUrl.ts
 *
 * Single Source of Truth for Application Origin and Canonical URL Resolution.
 *
 * Reads NEXT_PUBLIC_SITE_URL or SITE_URL.
 * - In production: throws an error if NEXT_PUBLIC_SITE_URL / SITE_URL is not defined.
 * - In local development / test: falls back cleanly to http://localhost:3000.
 */

function resolveCanonicalOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;

  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // Default to the canonical custom domain in production if not explicitly configured
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE_BUILD_IGNORE) {
    return "https://a1score.app";
  }

  return "http://localhost:3000";
}

export const SITE_URL: string = resolveCanonicalOrigin();

/**
 * Returns the canonical URL for a given relative or absolute path.
 * Guaranteed to return an absolute URL rooted at SITE_URL.
 */
export function getCanonicalUrl(path: string = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}
