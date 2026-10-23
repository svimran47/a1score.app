import test from "node:test";
import assert from "node:assert/strict";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import { formatTitle, constructMetadata } from "../src/lib/metadata";
import { getClubSlug, getLeagueSlug, getPlayerSlug } from "../src/lib/slugs";

test("SEO Metadata - formatTitle respects | a1score and avoids duplicate suffixes", () => {
  assert.equal(
    formatTitle("Erling Haaland market value, club and transfer history | a1score"),
    "Erling Haaland market value, club and transfer history | a1score"
  );
  assert.equal(
    formatTitle("Manchester City squad value, players and transfers | a1score"),
    "Manchester City squad value, players and transfers | a1score"
  );
  assert.equal(
    formatTitle("Premier League clubs, players and market values | a1score"),
    "Premier League clubs, players and market values | a1score"
  );
  assert.equal(
    formatTitle("Most valuable football players | a1score"),
    "Most valuable football players | a1score"
  );
  assert.equal(
    formatTitle("Football news | a1score"),
    "Football news | a1score"
  );
});

test("SEO Metadata - Title and Description length constraints", () => {
  const playerTitle = formatTitle("Erling Haaland market value, club and transfer history | a1score");
  assert.ok(playerTitle.includes("| a1score"));

  const playerDesc = "Erling Haaland (Centre-Forward, Manchester City) is valued at €180M. See value history, transfers and club details.";
  assert.ok(playerDesc.length <= 155, `Description too long: ${playerDesc.length} chars`);

  const clubTitle = formatTitle("Manchester City squad value, players and transfers | a1score");
  assert.ok(clubTitle.length <= 65);

  const clubDesc = "Manchester City squad is valued at €1.26B with 25 players. See squad value, player profiles, and transfer history.";
  assert.ok(clubDesc.length <= 155);

  const leagueTitle = formatTitle("Premier League clubs, players and market values | a1score");
  assert.ok(leagueTitle.length <= 65);

  const leagueDesc = "Premier League standings, 20 clubs, top players, and squad market values. See table and financial analytics.";
  assert.ok(leagueDesc.length <= 155);
});

test("SEO JSON-LD - Schema.org Person structure for player", () => {
  const dummyPlayer = {
    fullName: "Erling Haaland",
    photoUrl: "https://example.com/haaland.jpg",
    nationality: ["Norway"],
    dateOfBirth: "2000-07-21T00:00:00.000Z",
    currentClub: {
      id: "cmuihndux0003b23fizizm4a0",
      name: "Manchester City",
    },
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: dummyPlayer.fullName,
    image: dummyPlayer.photoUrl,
    nationality: dummyPlayer.nationality[0],
    birthDate: "2000-07-21",
    affiliation: {
      "@type": "SportsTeam",
      name: dummyPlayer.currentClub.name,
      url: `https://a1score.app/clubs/${getClubSlug(dummyPlayer.currentClub)}`,
    },
  };

  assert.equal(jsonLd["@context"], "https://schema.org");
  assert.equal(jsonLd["@type"], "Person");
  assert.equal(jsonLd.name, "Erling Haaland");
  assert.equal(jsonLd.nationality, "Norway");
  assert.equal(jsonLd.birthDate, "2000-07-21");
  assert.equal(jsonLd.affiliation["@type"], "SportsTeam");
  assert.ok(jsonLd.affiliation.url.includes("manchester-city"));
});

test("SEO JSON-LD - Schema.org SportsTeam structure for club", () => {
  const dummyClub = {
    id: "cmuihndux0003b23fizizm4a0",
    name: "Manchester City",
    logoUrl: "https://example.com/mancity.png",
    league: {
      id: "cmuihndux0003b23fizizm4a0",
      name: "Premier League",
    },
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: dummyClub.name,
    sport: "Football",
    logo: dummyClub.logoUrl,
    memberOf: {
      "@type": "SportsOrganization",
      name: dummyClub.league.name,
      url: `https://a1score.app/leagues/${getLeagueSlug(dummyClub.league)}`,
    },
  };

  assert.equal(jsonLd["@type"], "SportsTeam");
  assert.equal(jsonLd.name, "Manchester City");
  assert.equal(jsonLd.sport, "Football");
  assert.equal(jsonLd.memberOf["@type"], "SportsOrganization");
  assert.ok(jsonLd.memberOf.url.includes("premier-league"));
});

test("SEO JSON-LD - Schema.org BreadcrumbList structure", () => {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://a1score.app" },
      { "@type": "ListItem", position: 2, name: "Market Values", item: "https://a1score.app/values" },
      { "@type": "ListItem", position: 3, name: "Erling Haaland", item: "https://a1score.app/players/erling-haaland-418560" },
    ],
  };

  assert.equal(breadcrumbJsonLd["@type"], "BreadcrumbList");
  assert.equal(breadcrumbJsonLd.itemListElement.length, 3);
  assert.equal(breadcrumbJsonLd.itemListElement[0].name, "Home");
  assert.equal(breadcrumbJsonLd.itemListElement[1].name, "Market Values");
  assert.equal(breadcrumbJsonLd.itemListElement[2].name, "Erling Haaland");
});

test("SEO Robots - allows crawling of pages, css, js, images and references sitemap", () => {
  const r = robots();
  const sitemapUrl = Array.isArray(r.sitemap) ? r.sitemap[0] : r.sitemap;
  assert.ok(sitemapUrl?.endsWith("/sitemap.xml"));
  const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
  assert.equal(rules.userAgent, "*");
  assert.equal(rules.allow, "/");
  // Ensure CSS, JS, images, and public routes are NOT disallowed
  const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
  assert.ok(!disallowed.includes("/_next/"));
  assert.ok(!disallowed.includes("/img/"));
  assert.ok(!disallowed.includes("/players"));
  assert.ok(!disallowed.includes("/clubs"));
  assert.ok(!disallowed.includes("/leagues"));
});

test("SEO Sitemap - includes static core, news, leagues, and dynamic entities", async () => {
  const entries = await sitemap();
  const urls = entries.map((e) => e.url);

  // Core pages
  assert.ok(urls.some((u) => u.endsWith("/values")), "Must include /values");
  assert.ok(urls.some((u) => u.endsWith("/players")), "Must include /players");
  assert.ok(urls.some((u) => u.endsWith("/clubs")), "Must include /clubs");
  assert.ok(urls.some((u) => u.endsWith("/leagues")), "Must include /leagues");
  assert.ok(urls.some((u) => u.endsWith("/news")), "Must include /news");

  // Tracked leagues
  assert.ok(urls.some((u) => u.includes("/leagues/premier-league")), "Must include premier league");
  assert.ok(urls.some((u) => u.includes("/leagues/laliga")), "Must include laliga");
  assert.ok(urls.some((u) => u.includes("/leagues/bundesliga")), "Must include bundesliga");
});

test("SEO Origin Parity - sitemap, robots, and metadata canonicals share exact SITE_URL origin", async () => {
  const { SITE_URL, getCanonicalUrl } = await import("../src/lib/siteUrl");
  const parsedSiteUrl = new URL(SITE_URL);

  // 1. Robots sitemap URL matches SITE_URL origin
  const r = robots();
  const sitemapUrl = Array.isArray(r.sitemap) ? r.sitemap[0] : r.sitemap;
  assert.ok(sitemapUrl, "robots must define a sitemap URL");
  const parsedRobotsSitemap = new URL(sitemapUrl!);
  assert.equal(parsedRobotsSitemap.origin, parsedSiteUrl.origin);

  // 2. getCanonicalUrl produces exact canonical matching SITE_URL origin
  const matchCanonical = getCanonicalUrl("/matches");
  assert.equal(new URL(matchCanonical).origin, parsedSiteUrl.origin);
  assert.equal(matchCanonical, `${SITE_URL}/matches`);

  // 3. constructMetadata canonical & OG match SITE_URL origin
  const meta = constructMetadata({
    title: "Test Page",
    description: "Test page description",
    path: "/matches",
  });
  assert.equal(new URL(meta.alternates?.canonical as string).origin, parsedSiteUrl.origin);
  assert.equal(new URL((meta.openGraph as any)?.url).origin, parsedSiteUrl.origin);
  assert.equal(meta.title, "Test Page | a1score");
});

test("SEO Robots - multi-bot coverage and host directive", () => {
  const r = robots();
  assert.equal(r.host, "a1score.app");
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
  const userAgents = rules.map((rule) => rule.userAgent);
  assert.ok(userAgents.includes("*"));
  assert.ok(userAgents.includes("Googlebot"));
  assert.ok(userAgents.includes("Bingbot"));
  assert.ok(userAgents.includes("Applebot"));
  assert.ok(userAgents.includes("YandexBot"));

  // Check disallow rules are present
  const starRule = rules.find((rule) => rule.userAgent === "*");
  const disallowed = Array.isArray(starRule?.disallow) ? starRule?.disallow : [starRule?.disallow];
  assert.ok(disallowed.includes("/search"));
  assert.ok(disallowed.includes("/api/"));
  assert.ok(disallowed.includes("/admin/"));
  assert.ok(disallowed.includes("/maintenance"));
  assert.ok(disallowed.includes("/signin"));
  assert.ok(disallowed.includes("/settings"));
});

test("SEO Sitemap - includes tool routes (compare, lineup-builder, predict)", async () => {
  const entries = await sitemap();
  const urls = entries.map((e) => e.url);

  assert.ok(urls.some((u) => u.endsWith("/compare")), "Must include /compare");
  assert.ok(urls.some((u) => u.endsWith("/lineup-builder")), "Must include /lineup-builder");
  assert.ok(urls.some((u) => u.endsWith("/predict")), "Must include /predict");
});

test("SEO JSON-LD - Schema.org WebSite with SearchAction and Organization structure", () => {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "a1score",
    alternateName: ["a1score.app", "A1 Score"],
    url: "https://a1score.app",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://a1score.app/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  assert.equal(websiteSchema["@context"], "https://schema.org");
  assert.equal(websiteSchema["@type"], "WebSite");
  assert.equal(websiteSchema.name, "a1score");
  assert.equal(websiteSchema.potentialAction["@type"], "SearchAction");
  assert.ok(websiteSchema.potentialAction.target.urlTemplate.includes("search?q="));

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: "a1score",
    url: "https://a1score.app",
    logo: "https://a1score.app/icon-512.png",
  };

  assert.equal(orgSchema["@type"], "SportsOrganization");
  assert.equal(orgSchema.name, "a1score");
  assert.equal(orgSchema.logo, "https://a1score.app/icon-512.png");
});

