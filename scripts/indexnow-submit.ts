/**
 * scripts/indexnow-submit.ts
 *
 * Submits every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam,
 * Naver and others share submissions), so new and changed pages are crawled
 * within hours instead of days. Google does not use IndexNow; it reads the
 * sitemap from Search Console.
 *
 * The key is public by design: IndexNow verifies it by fetching
 * https://a1score.app/<key>.txt, which lives in /public.
 *
 * Usage: npx tsx scripts/indexnow-submit.ts [--dry-run]
 */

const SITE = (process.env.SITE_URL || "https://a1score.app").replace(/\/+$/, "");
const KEY = "4c025537af9ba24bc27bb05b0986a6ae";
const BATCH = 10_000; // IndexNow accepts up to 10,000 URLs per request

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  console.log(`Found ${urls.length} URLs in ${SITE}/sitemap.xml`);
  if (dryRun || urls.length === 0) return;

  const host = new URL(SITE).host;
  for (let i = 0; i < urls.length; i += BATCH) {
    const urlList = urls.slice(i, i + BATCH);
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
    });
    // 200 = accepted, 202 = accepted pending key verification
    console.log(`Batch ${i / BATCH + 1}: ${urlList.length} URLs -> HTTP ${r.status}`);
    if (r.status >= 400) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
