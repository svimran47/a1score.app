import type { Metadata } from "next";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { PredictClient } from "@/components/predict/PredictClient";

export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Football Match Predictor — Predict Scores & Win Points",
  description:
    "Predict upcoming football match scores, challenge fellow fans, earn points for exact scorelines, and climb the leaderboard on a1score.",
  path: "/predict",
});

export default function PredictPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Match Predictor", item: `${SITE_URL}/predict` },
    ],
  };

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "a1score Match Predictor",
    url: `${SITE_URL}/predict`,
    applicationCategory: "SportsApplication",
    operatingSystem: "All",
    description: "Interactive football match prediction game and leaderboard.",
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
      <PredictClient />
    </>
  );
}
