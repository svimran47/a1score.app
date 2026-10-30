import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Card, SectionHeader } from "@/components/ui";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { RANKINGS, RANKING_KIND_LABELS, type RankingKind } from "@/lib/rankings";

export const revalidate = 86400;
export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Football player rankings by market value | a1score",
  description:
    "Most valuable football players by position, age, nationality and league. Rankings built from current market values and updated daily.",
  path: "/rankings",
});

const KIND_ORDER: RankingKind[] = ["league", "position", "age", "nation"];

export default function RankingsHubPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Rankings", item: `${SITE_URL}/rankings` },
    ],
  };

  return (
    <div className="max-w-[720px] mx-auto space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div>
        <Breadcrumbs className="mb-2" items={[{ label: "Home", href: "/" }, { label: "Rankings" }]} />
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Player rankings</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
          The most valuable footballers, sliced the way fans argue about them: by league, position, age and nation.
        </p>
      </div>

      {KIND_ORDER.map((kind) => (
        <section key={kind}>
          <SectionHeader title={RANKING_KIND_LABELS[kind]} />
          <Card className="p-1">
            <ul className="grid grid-cols-1 sm:grid-cols-2">
              {RANKINGS.filter((r) => r.kind === kind).map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/rankings/${r.slug}`}
                    className="flex min-h-[44px] items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    {r.heading}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
