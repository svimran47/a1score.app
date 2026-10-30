import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs, Card, PlayerRow, SectionHeader } from "@/components/ui";
import { ShareButton } from "@/components/ui/ShareButton";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { getRanking, getRelatedRankings } from "@/lib/rankings";
import { getRankedPlayers } from "@/lib/data/rankings";
import { formatValueEur } from "@/lib/format-value";

export const revalidate = 3600;
export const runtime = "edge";

interface RankingPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: RankingPageProps): Promise<Metadata> {
  const def = getRanking(params.slug);
  if (!def) {
    return constructMetadata({
      title: "Ranking not found",
      description: "This ranking does not exist.",
      path: `/rankings/${params.slug}`,
      noIndex: true,
    });
  }

  const players = await getRankedPlayers(def, 3);
  const top = players
    .map((p) => {
      const v = formatValueEur(p.marketValue);
      return v ? `${p.name} (${v})` : p.name;
    })
    .join(", ");
  const year = new Date().getUTCFullYear();
  const desc = top
    ? `${def.heading} ${year}: ${top} lead the list. Full top 50 by market value, updated daily.`
    : `${def.heading} ${year}, ranked by market value and updated daily.`;

  return constructMetadata({
    title: `${def.heading} (${year}) | a1score`,
    description: desc.length > 155 ? desc.slice(0, 152) + "..." : desc,
    path: `/rankings/${def.slug}`,
    image: `/rankings/${def.slug}/opengraph-image`,
  });
}

export default async function RankingPage({ params }: RankingPageProps) {
  const def = getRanking(params.slug);
  if (!def) notFound();

  const players = await getRankedPlayers(def, 50);
  const related = getRelatedRankings(def.slug, 8);
  const url = `${SITE_URL}/rankings/${def.slug}`;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: def.heading,
    url,
    numberOfItems: players.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: players.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: p.name,
      url: `${SITE_URL}/players/${p.slug}`,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Rankings", item: `${SITE_URL}/rankings` },
      { "@type": "ListItem", position: 3, name: def.heading, item: url },
    ],
  };

  return (
    <div className="max-w-[720px] mx-auto space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div>
        <Breadcrumbs
          className="mb-2"
          items={[
            { label: "Home", href: "/" },
            { label: "Rankings", href: "/rankings" },
            { label: def.heading },
          ]}
        />
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{def.heading}</h1>
          <ShareButton title={def.heading} url={url} />
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{def.intro}</p>
      </div>

      <section>
        <SectionHeader title={`Top ${players.length || 50} by market value`} />
        <Card className="p-1 space-y-0.5">
          {players.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              This ranking couldn&apos;t be loaded. Try again in a moment.
            </p>
          ) : (
            players.map((p, idx) => (
              <PlayerRow
                key={p.id}
                rank={idx + 1}
                id={p.id}
                name={p.name}
                slug={p.slug}
                avatarUrl={p.photoUrl}
                clubName={p.club?.name}
                clubCrest={p.club?.logoUrl}
                position={p.position}
                age={p.age}
                nationality={p.nationality}
                marketValue={p.marketValue}
              />
            ))
          )}
        </Card>
      </section>

      <nav aria-label="More rankings">
        <SectionHeader title="More rankings" href="/rankings" actionLabel="All rankings" />
        <ul className="flex flex-wrap gap-2">
          {related.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/rankings/${r.slug}`}
                className="inline-flex min-h-[36px] items-center rounded-[var(--radius-pill)] bg-[var(--bg-chip)] px-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                {r.heading}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
