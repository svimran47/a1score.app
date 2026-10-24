import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getPlayerProfile } from "@/lib/data/playerProfile";
import { formatValueEur } from "@/lib/format-value";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { Breadcrumbs } from "@/components/ui";
import { PlayerHero } from "@/components/players/PlayerHero";
import { ProfileSectionNav } from "@/components/players/ProfileSectionNav";
import { ValueSection } from "@/components/players/ValueSection";
import { TransfersSection } from "@/components/TransfersTable";
import { SeasonSection, SeasonSkeleton } from "@/components/players/SeasonSection";
import { InjuriesSection } from "@/components/InjuriesTable";
import { HonoursSection } from "@/components/players/HonoursSection";
import { ProfileFactsSection } from "@/components/KeyFacts";
import { NewsSection } from "@/components/news/RelatedNewsCard";
import type { PlayerProfileVM } from "@/lib/data/playerProfile.types";

export const revalidate = 3600; // ISR revalidation every hour
export const runtime = "edge";

interface PlayerPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const vm = await getPlayerProfile(params.slug);
  if (!vm) {
    return constructMetadata({
      title: "Player Not Found | a1score",
      description: "The requested football player profile could not be located.",
      path: `/players/${params.slug}`,
      noIndex: true,
    });
  }

  const { displayName, fullName, position, slug } = vm.identity;
  const value = formatValueEur(vm.valuation.current?.valueEur);
  // Segments are omitted when unknown; never "Free Agent" or "Footballer".
  const context = [position, vm.club?.name].filter(Boolean).join(", ");
  const who = context ? `${fullName || displayName} (${context})` : fullName || displayName;

  const rawTitle = `${fullName || displayName} market value, club and transfer history | a1score`;
  const desc = value
    ? `${who} is valued at ${value}. See value history, transfers and club details.`
    : `${who}. See value history, transfers and club details.`;

  return constructMetadata({
    title: rawTitle,
    description: desc.length > 155 ? desc.slice(0, 152) + "..." : desc,
    path: `/players/${slug}`,
    image: `/players/${slug}/opengraph-image`,
  });
}

/** Sections known on the server, in DOM order. Season streams in and adds its own chip. */
function navSections(vm: PlayerProfileVM) {
  const s: { id: string; label: string }[] = [];
  if (vm.valuation.points.length > 0) s.push({ id: "value", label: "Value" });
  if (vm.transfers.length > 0) s.push({ id: "transfers", label: "Transfers" });
  if (vm.injuries.length > 0) s.push({ id: "injuries", label: "Injuries" });
  if (vm.honours && vm.honours.totalTitles > 0) s.push({ id: "honours", label: "Honours" });
  const facts = [
    vm.identity.dob,
    vm.identity.heightCm,
    vm.identity.preferredFoot,
    vm.identity.nationality,
    vm.identity.fullName && vm.identity.fullName !== vm.identity.displayName ? vm.identity.fullName : null,
    vm.identity.alsoPlays,
  ].filter(Boolean).length;
  if (facts >= 2) s.push({ id: "profile", label: "Profile" });
  if (vm.news && vm.news.items.length > 0) s.push({ id: "news", label: "News" });
  return s;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const vm = await getPlayerProfile(params.slug);

  if (!vm) {
    notFound();
  }

  // 301 redirect any non-canonical slug, accent-stripped legacy slug, or raw ID to canonical slug URL
  const canonicalSlug = vm.identity.slug;
  if (params.slug !== canonicalSlug) {
    permanentRedirect(`/players/${canonicalSlug}`);
  }

  const baseUrl = SITE_URL;
  const canonicalUrl = `${baseUrl}/players/${canonicalSlug}`;
  const { identity, club, honours } = vm;

  const awardsList = (honours?.all ?? []).map((a) => `${a.titleCount}x ${a.competitionName}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: identity.fullName,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    ...(identity.position ? { jobTitle: identity.position } : {}),
    ...(identity.photoUrl ? { image: identity.photoUrl } : {}),
    ...(identity.nationality ? { nationality: identity.nationality } : {}),
    ...(identity.dob ? { birthDate: identity.dob.split("T")[0] } : {}),
    ...(identity.heightCm
      ? {
          height: {
            "@type": "QuantitativeValue",
            value: identity.heightCm,
            unitCode: "CMT",
          },
        }
      : {}),
    ...(identity.key && /^\d+$/.test(identity.key)
      ? {
          sameAs: [
            `https://www.transfermarkt.com/player/profil/spieler/${identity.key}`,
          ],
        }
      : {}),
    ...(awardsList.length > 0 ? { award: awardsList } : {}),
    ...(club
      ? {
          affiliation: {
            "@type": "SportsTeam",
            name: club.name,
            ...(club.href ? { url: `${baseUrl}${club.href}` } : {}),
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Market Values", item: `${baseUrl}/values` },
      { "@type": "ListItem", position: 3, name: identity.fullName, item: canonicalUrl },
    ],
  };

  const sections = navSections(vm);

  return (
    <article id="top" aria-labelledby="player-name" className="@container/profile max-w-[720px] mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Breadcrumbs
        className="hidden sm:flex mb-2"
        items={[
          { label: "Home", href: "/" },
          { label: "Market values", href: "/values" },
          { label: identity.displayName },
        ]}
      />

      <PlayerHero vm={vm} canonicalUrl={canonicalUrl} />

      <ProfileSectionNav sections={sections} valueEur={vm.valuation.current?.valueEur ?? null} />

      <div className="space-y-8 pt-4 @[560px]/profile:pt-6">
        <ValueSection vm={vm} />
        <TransfersSection vm={vm} />
        <Suspense fallback={<SeasonSkeleton />}>
          <SeasonSection vm={vm} />
        </Suspense>
        <InjuriesSection vm={vm} />
        <HonoursSection vm={vm} />
        <ProfileFactsSection vm={vm} />
        <NewsSection vm={vm} />
      </div>
    </article>
  );
}
