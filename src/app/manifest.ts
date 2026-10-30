import { MetadataRoute } from "next";
import { OG_COLORS } from "@/lib/og/colors";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "a1score — Money meets the pitch",
    short_name: "a1score",
    description: "Football market valuation updates, squad analytics, and club records.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0a1f", // color-ignore: PWA manifest specification requires hex
    theme_color: "#1e1240", // color-ignore: PWA manifest specification requires hex
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["sports", "news"],
  };
}
