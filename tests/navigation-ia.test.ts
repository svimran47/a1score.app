import test from "node:test";
import assert from "node:assert/strict";
import {
  BOTTOM_TABS,
  MORE_ACCOUNT,
  MORE_FEATURES,
  getActiveBottomTab,
  isUnder,
} from "../src/lib/nav/config";
import { parseThemePreference, resolveTheme, themeLabel } from "../src/lib/theme";
import { followValueChange } from "../src/lib/watchlist/valueChange";
import { sortMatchesByTime } from "../src/lib/matches/byTime";
import { matchesLeagueQuery } from "../src/lib/leagues/search";
import { forYouFeed, leagueFeed, mentionsTopic, transfersFeed } from "../src/lib/news/feeds";
import type { FotmobLeagueGroup, FotmobMatch } from "../src/lib/fotmob/client";
import type { NewsItem } from "../src/types/news";

test("bottom bar is Matches · News · Leagues · Following · More, in that order", () => {
  assert.deepEqual(
    BOTTOM_TABS.map((t) => t.label),
    ["Matches", "News", "Leagues", "Following", "More"]
  );
  // Every tab is a real route, never a sheet toggle.
  for (const tab of BOTTOM_TABS) assert.match(tab.href, /^\/[a-z]+$/);
});

test("exactly one bottom tab is active for each route", () => {
  const cases: Record<string, string | null> = {
    "/": "matches",
    "/matches": "matches",
    "/matches/4500123": "matches",
    "/news": "news",
    "/leagues": "leagues",
    "/leagues/premier-league-abc": "leagues",
    "/following": "following",
    "/watchlist": "following",
    "/more": "more",
    "/settings": "more",
    "/settings/notifications": "more",
    "/values": "more",
    "/transfers": "more",
    "/tv": "more",
    "/compare": "more",
    "/predict": "more",
    "/lineup-builder": "more",
    "/players/erling-haaland-1": "more",
    "/clubs/arsenal-2": "more",
    "/privacy": "more",
    "/status": null,
  };
  for (const [path, expected] of Object.entries(cases)) {
    const active = BOTTOM_TABS.filter((t) => t.isActive(path)).map((t) => t.key);
    assert.ok(active.length <= 1, `${path} activates ${active.join(", ")}`);
    assert.equal(getActiveBottomTab(path), expected, path);
  }
});

test("isUnder matches the route and its children but not lookalike prefixes", () => {
  assert.equal(isUnder("/news", "/news"), true);
  assert.equal(isUnder("/news/abc", "/news"), true);
  assert.equal(isUnder("/newsletter", "/news"), false);
});

test("More hub lists every feature and account row with a route", () => {
  const keys = [...MORE_FEATURES, ...MORE_ACCOUNT].map((i) => i.key);
  assert.deepEqual(keys, ["values", "rankings", "transfers", "tv", "compare", "predict", "lineup", "players", "clubs", "notifications", "settings"]);
  assert.equal(new Set([...MORE_FEATURES, ...MORE_ACCOUNT].map((i) => i.href)).size, keys.length);
});

test("theme preference parses, resolves and labels", () => {
  assert.equal(parseThemePreference(null), "dark");
  assert.equal(parseThemePreference("bogus"), "dark");
  assert.equal(parseThemePreference("system"), "system");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(themeLabel("system"), "System default");
});

test("followValueChange reports change since following, or null", () => {
  assert.deepEqual(followValueChange({ initialValueEur: 100, currentValueEur: 120 }), { current: 120, pct: 20 });
  assert.equal(followValueChange({ initialValueEur: 100, currentValueEur: 75 }).pct, -25);
  assert.equal(followValueChange({ initialValueEur: 100, currentValueEur: 100 }).pct, null);
  assert.deepEqual(followValueChange({}), { current: 0, pct: null });
});

function match(id: number, timeTS: number): FotmobMatch {
  return {
    id,
    leagueId: 1,
    time: "",
    timeTS,
    home: { id: 1, name: "H" },
    away: { id: 2, name: "A" },
    status: { utcTime: new Date(timeTS).toISOString(), started: false, finished: false, cancelled: false },
    isLive: false,
    isFinished: false,
    isUpcoming: true,
  };
}

test("sortMatchesByTime flattens leagues into kick-off order and keeps ties stable", () => {
  const leagues: FotmobLeagueGroup[] = [
    { id: 1, name: "Premier League", ccode: "eng", matches: [match(1, 3000), match(2, 1000)] },
    { id: 2, name: "LaLiga", ccode: "", matches: [match(3, 2000), match(4, 1000)] },
  ];
  const rows = sortMatchesByTime(leagues);
  assert.deepEqual(rows.map((r) => r.match.id), [2, 4, 3, 1]);
  assert.equal(rows[0].leagueName, "ENG - Premier League");
  assert.equal(rows[1].leagueName, "LaLiga");
});

test("Find leagues matches name or country, ignoring case and accents", () => {
  const league = { name: "Liga Portugal", country: "Portugal" };
  assert.equal(matchesLeagueQuery(league, ""), true);
  assert.equal(matchesLeagueQuery(league, "  liga "), true);
  assert.equal(matchesLeagueQuery({ name: "Süper Lig", country: "Türkiye" }, "super"), true);
  assert.equal(matchesLeagueQuery(league, "serie"), false);
});

function news(id: string, title: string, publishedAt: string, tags: string[] = []): NewsItem {
  return { id, title, snippet: "", source: "x", publishedAt, url: "https://example.com", tags };
}

test("news feeds: For you, Transfers and Leagues", () => {
  const items = [
    news("a", "Arsenal beat Chelsea", "2026-10-14T10:00:00Z", ["Premier League"]),
    news("b", "Transfer news: Bayern eye striker", "2026-10-15T10:00:00Z", ["Bundesliga"]),
    news("c", "Mbappé scores twice", "2026-10-13T10:00:00Z", ["LaLiga"]),
  ];
  assert.deepEqual(forYouFeed(items, ["Arsenal", "Kylian Mbappe"]).map((i) => i.id), ["a"]);
  assert.deepEqual(forYouFeed(items, ["Mbappe"]).map((i) => i.id), ["c"]);
  assert.deepEqual(forYouFeed(items, []), []);
  assert.deepEqual(transfersFeed(items).map((i) => i.id), ["b"]);
  assert.deepEqual(leagueFeed(items, "LaLiga").map((i) => i.id), ["c"]);
  assert.deepEqual(leagueFeed(items, null).map((i) => i.id), ["b", "a", "c"]);
  assert.equal(mentionsTopic(items[0], ""), false);
});
