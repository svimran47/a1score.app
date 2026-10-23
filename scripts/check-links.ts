/**
 * scripts/check-links.ts
 *
 * Link Checker Suite for a1score.app
 * Crawls and verifies every internal link on:
 * - Home page (/)
 * - Players directory (/players)
 * - Clubs directory (/clubs)
 * - Leagues directory (/leagues)
 * - Club profile (/clubs/manchester-city-cmuihq3vs0069h29ebm5xqhye)
 * - League profile (/leagues/premier-league-cmuihndux0003b23fizizm4a0)
 * - Player profile (/players/erling-haaland-418560)
 *
 * Verifies HTTP status codes and ensures 0 broken links (404/Not Found).
 */

const BASE_URL = process.argv[2] || "https://a1score.pages.dev";

const SEED_PAGES = [
  "/",
  "/players",
  "/clubs",
  "/leagues",
  "/privacy",
  "/terms",
  "/clubs/manchester-city-cmuihq3vs0069h29ebm5xqhye",
  "/leagues/premier-league-cmuihndux0003b23fizizm4a0",
  "/players/erling-haaland-418560",
];

// Test legacy redirect URLs (R2-7)
const REDIRECT_URLS = [
  "/values",
  "/clubs/cmuihq3vs0069h29ebm5xqhye",
  "/clubs/281",
  "/clubs/8456",
  "/leagues/cmuihndux0003b23fizizm4a0",
  "/leagues/premier-league",
  "/leagues/laliga-cmuihnet00007b23f2qf4z79i",
];

interface LinkResult {
  url: string;
  source: string;
  status: number;
  finalUrl: string;
  passed: boolean;
  error?: string;
}

async function checkUrl(path: string, source: string): Promise<LinkResult> {
  const fullUrl = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  try {
    const res = await fetch(fullUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "A1ScoreLinkChecker/1.0",
      },
    });

    const text = await res.text();
    const isNotFoundPage =
      text.includes("Page Not Found") ||
      text.includes("Competition Not Found") ||
      text.includes("Club Not Found") ||
      text.includes("Player Not Found");

    const passed = res.status < 400 && !isNotFoundPage;

    return {
      url: path,
      source,
      status: res.status,
      finalUrl: res.url,
      passed,
      error: !passed ? (isNotFoundPage ? "Page rendered 'Not Found'" : `HTTP ${res.status}`) : undefined,
    };
  } catch (err: any) {
    return {
      url: path,
      source,
      status: 0,
      finalUrl: fullUrl,
      passed: false,
      error: err.message || "Network Error",
    };
  }
}

async function checkRedirect(path: string): Promise<LinkResult> {
  const fullUrl = `${BASE_URL}${path}`;
  try {
    const res = await fetch(fullUrl, {
      redirect: "manual",
      headers: {
        "User-Agent": "A1ScoreLinkChecker/1.0",
      },
    });

    const isRedirect = res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308;
    const location = res.headers.get("location") || "";

    return {
      url: path,
      source: "Redirect Check",
      status: res.status,
      finalUrl: location,
      passed: isRedirect,
      error: !isRedirect ? `Expected 301/308 redirect, got ${res.status}` : undefined,
    };
  } catch (err: any) {
    return {
      url: path,
      source: "Redirect Check",
      status: 0,
      finalUrl: fullUrl,
      passed: false,
      error: err.message,
    };
  }
}

async function extractLinks(html: string): Promise<string[]> {
  const hrefRegex = /href=["']([^"']+)["']/g;
  const links = new Set<string>();
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/_next") && !href.startsWith("/api")) {
      links.add(href.split("#")[0].split("?")[0]);
    }
  }
  return Array.from(links);
}

async function main() {
  console.log(`====================================================`);
  console.log(`   a1score.app Automated Link Checker (R2-6, R2-7)  `);
  console.log(`   Base URL: ${BASE_URL}                            `);
  console.log(`====================================================\n`);

  const visited = new Set<string>();
  const results: LinkResult[] = [];

  console.log("--- 1. Checking Core Seed Pages ---");
  for (const page of SEED_PAGES) {
    if (visited.has(page)) continue;
    visited.add(page);

    console.log(`Checking page: ${page}`);
    const r = await checkUrl(page, "SEED");
    results.push(r);
    if (r.passed) {
      console.log(`  ✅ [${r.status}] ${page}`);
    } else {
      console.error(`  ❌ [${r.status}] ${page} - ${r.error}`);
    }

    // Crawl links from seed pages
    try {
      const fullUrl = `${BASE_URL}${page}`;
      const res = await fetch(fullUrl, { headers: { "User-Agent": "A1ScoreLinkChecker/1.0" } });
      const html = await res.text();
      const extracted = await extractLinks(html);
      for (const link of extracted) {
        if (!visited.has(link) && visited.size < 60) {
          visited.add(link);
          const linkRes = await checkUrl(link, page);
          results.push(linkRes);
          if (linkRes.passed) {
            console.log(`  ✅ [${linkRes.status}] (from ${page}) -> ${link}`);
          } else {
            console.error(`  ❌ [${linkRes.status}] (from ${page}) -> ${link} - ${linkRes.error}`);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  console.log("\n--- 2. Checking Canonical 301 Redirects (R2-7, R2-14) ---");
  for (const path of REDIRECT_URLS) {
    const r = await checkRedirect(path);
    results.push(r);
    if (r.passed) {
      console.log(`  ✅ [${r.status}] ${path} -> ${r.finalUrl}`);
    } else {
      console.error(`  ❌ [${r.status}] ${path} - ${r.error}`);
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log("\n====================================================");
  console.log(`LINK CHECK SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("====================================================");

  if (failedCount > 0) {
    console.error(`\nFailed Links:`);
    results
      .filter((r) => !r.passed)
      .forEach((f) => {
        console.error(`  - ${f.url} (from ${f.source}): ${f.error}`);
      });
    process.exit(1);
  } else {
    console.log("\n✨ ALL INTERNAL LINKS AND REDIRECTS PASSED VERIFICATION!");
  }
}

main().catch((err) => {
  console.error("Fatal Link Checker Error:", err);
  process.exit(1);
});
