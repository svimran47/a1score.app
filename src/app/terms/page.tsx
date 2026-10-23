import { constructMetadata, SITE_URL } from "@/lib/metadata";
import Link from "next/link";
import { FileText, AlertCircle, Scale, ShieldAlert, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Terms of Service",
  description: "Terms of service, usage disclaimers, and intellectual property notice for a1score.app.",
  path: "/terms",
});

export default function TermsPage() {
  const lastUpdated = "September 30, 2026";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Terms of Service", item: `${SITE_URL}/terms` },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-accent/10 border border-accent/20 text-value-text">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-text-muted">
              Last updated: {lastUpdated} • User Agreement & Disclaimer
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-divider bg-bg-card/40 space-y-6 text-sm text-text-secondary leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Scale className="w-4 h-4 text-value-text" /> 1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using a1score.app (&quot;the Service&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, please discontinue use of the platform.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-value-text" /> 2. Analytical & Informational Disclaimer
          </h2>
          <p>
            All market valuations, squad financial disparity ratios, and historical trajectories presented on a1score.app are provided strictly for informational, educational, and analytical enjoyment.
          </p>
          <p className="text-value-text bg-accent/10 border border-accent/20 p-3 rounded-xl text-xs">
            <strong>Disclaimer of Financial & Betting Advice:</strong> Market values are crowd-sourced and algorithmic estimates derived from Transfermarkt. They do not represent certified financial statements, formal appraisal audits, contractual buyout release fees, or betting recommendations.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-value-text" /> 3. No Official Affiliation
          </h2>
          <p>
            a1score.app is an independent research and analytics platform. We are not officially affiliated with, endorsed by, or sponsored by FIFA, UEFA, the Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, or any individual football club or player.
          </p>
          <p>
            All club crests, league logos, and player trademarks remain the intellectual property of their respective trademark owners and are displayed here solely for editorial identification and descriptive reporting under fair use principles.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-value-text" /> 4. Service Availability & Changes
          </h2>
          <p>
            We strive to provide uninterrupted service, but make no warranties regarding 100% server uptime, live match latency guarantees, or continuous third-party API availability. We reserve the right to modify or discontinue any metric or visualization at any time.
          </p>
        </section>
      </div>
    </div>
  );
}
