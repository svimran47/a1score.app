import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn, type ChildProcess } from "node:child_process";

const PORT = 8080;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function fetchUrl(path: string, timeoutMs = 10000): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}${path}`, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, body }));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${path}`));
    });
  });
}

async function ensureServerRunning(): Promise<ChildProcess | null> {
  try {
    const res = await fetchUrl("/", 2000);
    if (res.status === 200) {
      return null; // Already running
    }
  } catch {
    // Need to start
  }

  const child = spawn("cmd", ["/c", "npx", "next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    stdio: "ignore",
    detached: false,
  });

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetchUrl("/", 2000);
      if (res.status === 200) {
        return child;
      }
    } catch {
      // keep waiting
    }
  }

  throw new Error("Failed to start local Next.js server for test suite.");
}

test("Phase C & Phase D: Header, Bottom Navigation, and Footer Verification", async (t) => {
  const serverProc = await ensureServerRunning();
  t.after(() => {
    if (serverProc) {
      serverProc.kill();
    }
  });

  const { status, body } = await fetchUrl("/");
  assert.equal(status, 200, "Home page should return 200 OK");

  // PHASE C: Header Verification
  const headerMatch = body.match(/<header[\s\S]*?<\/header>/);
  assert.ok(headerMatch, "Header element must exist");
  const headerHtml = headerMatch[0];

  // 1. Logo and wordmark present
  assert.ok(headerHtml.includes("a1score"), "Header must include a1score wordmark");
  assert.ok(headerHtml.includes("A1"), "Header must include A1 logo badge");

  // 2. Separate home icon button removed from header (aria-label="Home" within top header)
  assert.ok(!headerHtml.includes('aria-label="Home"'), "Top header must not have redundant separate Home button");

  // 3. Mobile Bottom Navigation present with all 5 items
  assert.ok(body.includes('aria-label="Mobile Bottom Navigation"'), "Mobile bottom tab bar must be present");
  assert.ok(body.includes('href="/"') && body.includes(">Home</span>"), "Bottom navigation must include Home");
  assert.ok(body.includes('href="/matches"') && body.includes(">Matches</span>"), "Bottom navigation must include Matches");
  assert.ok(body.includes('href="/players"') && body.includes(">Players</span>"), "Bottom navigation must include Players");
  assert.ok(body.includes('href="/clubs"') && body.includes(">Clubs</span>"), "Bottom navigation must include Clubs");
  assert.ok(body.includes(">More</span>"), "Bottom navigation must include More");

  // 4. Chip row removed from header
  assert.ok(!body.includes("overflow-x-auto no-scrollbar scroll-smooth"), "Chip row must be removed from header");

  // PHASE D: Footer Verification
  // 1. Explore section with 6 categories
  assert.ok(body.includes(">Explore</h4>"), "Footer must have Explore column");
  assert.ok(body.includes('href="/matches">Matches<'), "Explore must link to Matches");
  assert.ok(body.includes('href="/players">Players<'), "Explore must link to Players");
  assert.ok(body.includes('href="/clubs">Clubs<'), "Explore must link to Clubs");
  assert.ok(body.includes('href="/leagues">Leagues<'), "Explore must link to Leagues");
  assert.ok(body.includes('href="/search?filter=valuable">Market Values<'), "Explore must link to Market Values");
  assert.ok(body.includes('href="/transfers">Transfers<'), "Explore must link to Transfers");

  // 2. Top Leagues with Ligue 1
  assert.ok(body.includes(">Top Leagues</h4>"), "Footer must have Top Leagues column");
  assert.ok(body.includes("Premier League"), "Top Leagues must include Premier League");
  assert.ok(body.includes("La Liga"), "Top Leagues must include La Liga");
  assert.ok(body.includes("Serie A"), "Top Leagues must include Serie A");
  assert.ok(body.includes("Bundesliga"), "Top Leagues must include Bundesliga");
  assert.ok(body.includes("Ligue 1"), "Top Leagues must include Ligue 1");

  // 3. REMOVED "Intelligence & Sources" section
  assert.ok(!body.includes("Intelligence & Sources"), "Intelligence & Sources section must be removed from Footer");
  assert.ok(!body.includes("View Data Methodology"), "View Data Methodology link must be removed from Footer");

  // 4. Bottom row with Privacy, Terms (Methodology removed)
  assert.ok(!body.includes('href="/methodology"'), "Bottom row must not link to Methodology");
  assert.ok(body.includes('href="/privacy"') || body.includes('href="#privacy"'), "Bottom row must link to Privacy");
  assert.ok(body.includes('href="/terms"') || body.includes('href="#terms"'), "Bottom row must link to Terms");
  assert.ok(body.includes("All rights reserved"), "Bottom row must include copyright notice");
});
