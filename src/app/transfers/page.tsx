import { getTransfersHubData } from "@/lib/data/transfers";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { PageHeader } from "@/components/ui";
import { TransfersHubClient } from "@/components/transfers/TransfersHubClient";
import { ShieldCheck, Info } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 3600;
export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Transfer Centre — Latest Moves & Record Fees",
  description:
    "Comprehensive football transfer tracker: documented commercial fees, record transfers, and market expenditure on a1score.app.",
  path: "/transfers",
});

export default async function TransfersPage() {
  const { allTimeRecords, recentCommercial, contractEndsAndRetirements, leagues } =
    await getTransfersHubData();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Transfers", item: `${SITE_URL}/transfers` },
    ],
  };

  return (
    <div className="space-y-6 max-w-[720px] mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PageHeader
        variant="directory"
        title="Transfer Centre"
        subtitle="Latest moves, record fees and contract ends."
      />

      <TransfersHubClient
        initialRecords={allTimeRecords}
        initialCommercial={recentCommercial}
        initialContractEnds={contractEndsAndRetirements}
        leagues={leagues}
      />

      {/* Verification Footnote */}
      <div className="pt-3 border-t border-[var(--divider)] space-y-1.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--value-text)]" />
            Documented Commercial Ledger
          </span>
          <span>Excludes internal youth academy progressions</span>
        </div>
        <p className="text-[10px] text-text-muted/80 flex items-center gap-1">
          <Info className="w-3 h-3 shrink-0" />
          Historical records and transaction valuations are based on documented commercial fees from Transfermarkt.
        </p>
      </div>
    </div>
  );
}
