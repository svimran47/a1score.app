import type { Metadata } from "next";
import { getNews } from "@/lib/data/news";
import { NewsDirectoryClient } from "@/components/news/NewsDirectoryClient";
import { constructMetadata, SITE_URL } from "@/lib/metadata";

export const revalidate = 300; // Edge revalidation every 5 minutes
export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Football news | a1score",
  description:
    "Latest breaking football news, transfer rumors, and player market valuation intelligence across Europe's top leagues.",
  path: "/news",
});

export default async function NewsPage() {
  const initialNews = await getNews();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "News", item: `${SITE_URL}/news` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <NewsDirectoryClient initialNews={initialNews} />
    </>
  );
}
