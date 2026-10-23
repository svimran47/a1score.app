import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_DIR = "C:\\Users\\User\\.gemini\\antigravity\\brain\\fba22140-55e8-4e1f-a357-ac9736cfbef8\\phase4-screenshots";
fs.mkdirSync(BASE_DIR, { recursive: true });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const APP_URL = "http://127.0.0.1:8080";

const VIEWPORTS = [
  { name: "360x640", width: 360, height: 640 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "2560x1440", width: 2560, height: 1440 },
  { name: "3840x2160", width: 3840, height: 2160 },
];

const PAGES = [
  { name: "home", path: "/" },
  { name: "matches", path: "/matches" },
  { name: "matches_detail", path: "/matches/5181851" },
  { name: "players", path: "/players" },
  { name: "player_detail", path: "/players/lamine-yamal-937958" },
  { name: "clubs", path: "/clubs" },
  { name: "leagues", path: "/leagues" },
];

async function run() {
  console.log("Starting Phase 4 Playwright Automated Test & Screenshot Run...");

  let browser;
  try {
    browser = await chromium.launch({
      executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (err) {
    console.log("Falling back to bundled chromium...", err.message);
    browser = await chromium.launch({ headless: true });
  }

  const results = [];
  let overflowIssues = 0;

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const p of PAGES) {
      const url = `${APP_URL}${p.path}`;
      const filename = `${p.name}_${vp.name}.png`;
      const outPath = path.join(BASE_DIR, filename);

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(800); // Allow fonts and data hydration

        // Check for horizontal overflow
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            bodyScrollWidth: body.scrollWidth,
            hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
          };
        });

        if (overflow.hasHorizontalOverflow) {
          console.warn(`⚠️ OVERFLOW DETECTED: ${p.name} @ ${vp.name}: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`);
          overflowIssues++;
        }

        await page.screenshot({ path: outPath, fullPage: false });
        console.log(`✓ Saved ${filename} (Overflow: ${overflow.hasHorizontalOverflow ? "YES" : "NO"})`);

        results.push({
          page: p.name,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          overflow: overflow.hasHorizontalOverflow,
          file: filename,
        });
      } catch (err) {
        console.error(`✗ Error capturing ${p.name} @ ${vp.name}:`, err.message);
      }
    }

    await context.close();
  }

  await browser.close();

  const manifestPath = path.join(BASE_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ timestamp: new Date().toISOString(), total: results.length, overflowIssues, results }, null, 2));

  console.log(`\n========================================`);
  console.log(`Phase 4 Test Finished: ${results.length} screenshots captured.`);
  console.log(`Total Horizontal Overflow Issues: ${overflowIssues}`);
  console.log(`Manifest saved to ${manifestPath}`);
  console.log(`========================================`);
}

run().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
