import { Suspense } from "react";
import { getAllClubs } from "@/lib/data/clubs";
import { ClubsDirectoryClient } from "@/components/ClubsDirectoryClient";

import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { getClubSlug } from "@/lib/slugs";
import type { Metadata } from "next";

export const revalidate = 3600;
export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Football Clubs Directory — Squad Market Values & Rosters",
  description:
    "Browse European and global football clubs ranked by cumulative squad market valuations, squad sizes, and active rosters on a1score.app.",
  path: "/clubs",
});

export default async function ClubsPage() {
  const clubs = await getAllClubs();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Clubs", item: `${SITE_URL}/clubs` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Football Clubs by Squad Market Value",
    itemListElement: (clubs || []).slice(0, 20).map((c: any, idx: number) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: c.name,
      url: `${SITE_URL}/clubs/${getClubSlug(c)}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Suspense
        fallback={
          <div className="rounded-3xl glass-panel p-12 border border-divider text-center text-text-muted text-sm">
            Loading football clubs directory...
          </div>
        }
      >
        <ClubsDirectoryClient initialClubs={clubs} />
      </Suspense>
    </>
  );
}
