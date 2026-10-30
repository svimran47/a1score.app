import test from "node:test";
import assert from "node:assert/strict";
import {
  RANKINGS,
  getRanking,
  getRelatedRankings,
  getRankingsForPlayer,
  minBirthDateForMaxAge,
} from "../src/lib/rankings";
import sitemap from "../src/app/sitemap";

test("Rankings - slugs are unique, url-safe and resolvable", () => {
  const slugs = RANKINGS.map((r) => r.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) {
    assert.match(s, /^[a-z0-9-]+$/);
    assert.equal(getRanking(s)?.slug, s);
  }
  assert.equal(getRanking("nope"), undefined);
});

test("Rankings - every definition has exactly one filter", () => {
  for (const r of RANKINGS) {
    const keys = Object.values(r.filter).filter((v) => v !== undefined);
    assert.equal(keys.length, 1, r.slug);
  }
});

test("Rankings - related links exclude the page itself and prefer the same kind", () => {
  const related = getRelatedRankings("most-valuable-brazilian-players", 4);
  assert.equal(related.length, 4);
  assert.ok(!related.some((r) => r.slug === "most-valuable-brazilian-players"));
  assert.ok(related.every((r) => r.kind === "nation"));
});

test("Rankings - player profile links match league, position, age and nation", () => {
  const out = getRankingsForPlayer({ positionGroup: "ATT", age: 20, nationality: "Brazil", leagueName: "Premier League" });
  assert.deepEqual(out.map((r) => r.slug), [
    "most-valuable-premier-league-players",
    "most-valuable-forwards",
    "most-valuable-under-21-players",
    "most-valuable-brazilian-players",
  ]);
  assert.deepEqual(getRankingsForPlayer({ age: 30, nationality: "Atlantis" }), []);
  assert.equal(getRankingsForPlayer({ age: 22 })[0].slug, "most-valuable-under-23-players");
});

test("Rankings - under-21 cut-off keeps players who are 20", () => {
  assert.equal(minBirthDateForMaxAge(21, new Date("2026-10-30T12:00:00Z")), "2005-10-31");
});

test("Rankings - sitemap lists the hub and every ranking", async () => {
  const urls = (await sitemap()).map((e) => e.url);
  assert.ok(urls.some((u) => u.endsWith("/rankings")));
  for (const r of RANKINGS) assert.ok(urls.some((u) => u.endsWith(`/rankings/${r.slug}`)), r.slug);
});
