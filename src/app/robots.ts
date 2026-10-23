import { MetadataRoute } from "next";
import { getEffectiveSiteUrl } from "@/lib/metadata";

export const runtime = "edge";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getEffectiveSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/search",
          "/api/",
          "/admin/",
          "/maintenance",
          "/signin",
          "/settings",
          "/auth/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/search",
          "/api/",
          "/admin/",
          "/maintenance",
          "/signin",
          "/settings",
          "/auth/",
        ],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: [
          "/search",
          "/api/",
          "/admin/",
          "/maintenance",
          "/signin",
          "/settings",
          "/auth/",
        ],
      },
      {
        userAgent: "Applebot",
        allow: "/",
        disallow: [
          "/search",
          "/api/",
          "/admin/",
          "/maintenance",
          "/signin",
          "/settings",
          "/auth/",
        ],
      },
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: [
          "/search",
          "/api/",
          "/admin/",
          "/maintenance",
          "/signin",
          "/settings",
          "/auth/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: "a1score.app",
  };
}
