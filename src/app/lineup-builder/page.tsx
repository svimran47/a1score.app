import { Suspense } from "react";
import type { Metadata } from "next";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { LineupBuilderClient } from "@/components/lineup/LineupBuilderClient";

export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Football Lineup Builder — Create XI & Calculate Squad Value",
  description:
    "Build custom football starting lineups, configure tactical formations, and calculate total combined squad market values on a1score.",
  path: "/lineup-builder",
});

export default function LineupBuilderPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Lineup Builder", item: `${SITE_URL}/lineup-builder` },
    ],
  };

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "a1score Lineup Builder",
    url: `${SITE_URL}/lineup-builder`,
    applicationCategory: "SportsApplication",
    operatingSystem: "All",
    description: "Build custom football starting lineups, select tactical formations, and calculate squad market values.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-bg-page animate-pulse" />}>
        <LineupBuilderClient />
      </Suspense>
    </>
  );
}
