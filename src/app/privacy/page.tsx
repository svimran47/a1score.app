import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL } from "@/lib/metadata";
import { ShieldCheck, Database, Lock, Eye, Bell, Megaphone, Mail, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Metadata } from "next";

export const runtime = "edge";

export const metadata: Metadata = constructMetadata({
  title: "Privacy Policy",
  description: "Privacy policy, zero-PII architecture, analytics, and cookie disclosures for a1score.app.",
  path: "/privacy",
});

export default function PrivacyPage() {
  const lastUpdated = "October 2026";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Privacy Policy", item: `${SITE_URL}/privacy` },
    ],
  };

  return (
    <main className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] rounded-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--bg-chip)] border border-[var(--divider)] text-[var(--accent)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Privacy Policy & Data Transparency
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Last updated: {lastUpdated} • Accounts are optional
              </p>
            </div>
          </div>
        </div>

        {/* Policy Content Card */}
        <Card className="border border-[var(--divider)] space-y-8 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" /> 1. What We Collect
            </h2>
            <p className="text-[var(--text-muted)]">
              a1score is an independent football market intelligence and match analytics platform. We believe that modern sports analytics should not come at the expense of user privacy.
            </p>
            <p className="text-[var(--text-muted)]">
              You can use every part of a1score without an account. If you choose to sign in, we keep only what syncing needs:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-muted)]">
              <li><strong>Without an account:</strong> we do not collect names, email addresses, phone numbers, or physical locations.</li>
              <li><strong>With an optional account:</strong> we store your email address (to sign you in), the players, clubs and leagues you follow, and your settings (theme, currency, measurement units and TV schedules country), so they sync across your devices. Accounts are run on Supabase; sign-in emails are sent through it.</li>
              <li><strong>Delete any time:</strong> Settings → Account → Delete account removes your account and everything synced to it from our servers.</li>
              <li>We do not log user IP addresses or build tracking profiles, and we do not sell, rent, or monetize your personal information with data brokers.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 pt-4 border-t border-[var(--divider)]">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--accent)]" /> 2. Cookie-Free Analytics & Performance Monitoring
            </h2>
            <p className="text-[var(--text-muted)]">
              To understand platform health and protect fast loading times, we use privacy-friendly, cookie-free telemetry (such as Cloudflare Web Analytics):
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-muted)]">
              <li><strong>Zero Cross-Site Tracking:</strong> No tracking cookies, third-party localStorage identifiers, or device fingerprints are generated or stored.</li>
              <li><strong>Strictly Permitted Event Counters:</strong> We collect aggregated counters for five high-level actions: <code className="px-1.5 py-0.5 rounded bg-[var(--bg-chip)] text-[var(--accent)]">follow</code>, <code className="px-1.5 py-0.5 rounded bg-[var(--bg-chip)] text-[var(--accent)]">share</code>, <code className="px-1.5 py-0.5 rounded bg-[var(--bg-chip)] text-[var(--accent)]">compare</code>, <code className="px-1.5 py-0.5 rounded bg-[var(--bg-chip)] text-[var(--accent)]">search used</code>, and <code className="px-1.5 py-0.5 rounded bg-[var(--bg-chip)] text-[var(--accent)]">push opt-in</code>. These events contain aggregate category counts with all user identifiers explicitly stripped.</li>
              <li><strong>Field Core Web Vitals:</strong> Real-user performance measurements (LCP, INP, CLS) are collected purely in aggregate to identify slow network connections or rendering bottlenecks.</li>
              <li><strong>Deferred Execution:</strong> Telemetry scripts load solely after user interaction or idle callback, ensuring zero degradation of Largest Contentful Paint (LCP).</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 pt-4 border-t border-[var(--divider)]">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--accent)]" /> 3. Web Push Notification Architecture
            </h2>
            <p className="text-[var(--text-muted)]">
              Our market valuation movement alert system adheres to W3C Web Push and RFC 8291/8292 standards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-muted)]">
              <li><strong>Anonymous Cryptographic Tokens:</strong> When you opt-in to notifications, your browser generates an ephemeral endpoint URL and public ECDH P-256 key. We store only this opaque browser token alongside player IDs you have explicitly followed.</li>
              <li><strong>No Personal Linkage:</strong> No phone number, email, username, or IP address is ever requested or tied to push subscriptions.</li>
              <li><strong>Strict Rate Limiting:</strong> We enforce an algorithmic maximum of 1 alert per device per day, preventing spam.</li>
              <li><strong>One-Click Revocation:</strong> You can revoke notification access instantly through your browser settings or the in-app notification controls, which immediately purges your token from our edge dispatch store.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 pt-4 border-t border-[var(--divider)]">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--accent)]" /> 4. Local Storage Disclosures
            </h2>
            <p className="text-[var(--text-muted)]">
              We utilize browser <code>localStorage</code> strictly for device-local user preferences:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-muted)]">
              <li><strong>Settings:</strong> Stores your theme, currency, measurement units and TV schedules country.</li>
              <li><strong>Following:</strong> Keeps the players, clubs and leagues you follow on your device. They leave the device only if you sign in, to sync with your account.</li>
              <li><strong>Sign-in session:</strong> If you sign in, keeps you signed in on this device until you sign out.</li>
              <li><strong>Privacy Preferences:</strong> Remembers your consent banner acknowledgment.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 pt-4 border-t border-[var(--divider)]">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[var(--accent)]" /> 5. Contextual Advertising & Layout Standards
            </h2>
            <p className="text-[var(--text-muted)]">
              If promotional or sponsorship ad slots are active on the site:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-muted)]">
              <li><strong>Contextual Only:</strong> Ads are non-personalized and contextual (aligned strictly with football sports content). We do not permit behavioral profiling or cross-site tracking cookies.</li>
              <li><strong>Reserved Zero-CLS Containers:</strong> Every ad slot is wrapped in a reserved fixed-height container clearly labeled &quot;Advertisement&quot;, guaranteeing zero Cumulative Layout Shift (CLS).</li>
              <li><strong>Ad-Free Safe Havens:</strong> Ad slots are strictly prohibited above primary player valuation cards, within table rows, and across all Watchlist and Settings surfaces.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 pt-4 border-t border-[var(--divider)]">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--accent)]" /> 6. Data Sources & Disclaimer
            </h2>
            <p className="text-[var(--text-muted)]">
              Live match intelligence, scores, and tactical event coordinates are powered by FotMob. Player market values, historical valuation curves, and commercial transfers are sourced from Transfermarkt. Valuation numbers reflect estimated economic indicators rather than official corporate financial accounting.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 pt-4 border-t border-[var(--divider)]">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[var(--accent)]" /> 7. Privacy Inquiries & Contact
            </h2>
            <p className="text-[var(--text-muted)]">
              If you have questions regarding our data practices or wish to submit feedback, please contact us at:
            </p>
            <p>
              <a
                href="mailto:privacy@a1score.app"
                className="text-[var(--accent)] hover:underline font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] rounded-xs"
              >
                privacy@a1score.app
              </a>
            </p>
          </section>
        </Card>
      </div>
    </main>
  );
}
