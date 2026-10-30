import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { OG_COLORS } from "../src/lib/og/colors";
import { constructMetadata, SITE_URL } from "../src/lib/metadata";
import PlayerOGImage, {
  size as playerSize,
  runtime as playerRuntime,
  contentType as playerContentType,
  revalidate as playerRevalidate,
} from "../src/app/players/[slug]/opengraph-image";
import ClubOGImage, {
  size as clubSize,
  runtime as clubRuntime,
  contentType as clubContentType,
  revalidate as clubRevalidate,
} from "../src/app/clubs/[id]/opengraph-image";
import MatchOGImage, {
  size as matchSize,
  runtime as matchRuntime,
  contentType as matchContentType,
  revalidate as matchRevalidate,
} from "../src/app/matches/[id]/opengraph-image";

test("Token Mapping Parity: tokens.css <-> src/lib/og/colors.ts", () => {
  const tokensPath = path.resolve(process.cwd(), "src/app/tokens.css");
  assert.ok(fs.existsSync(tokensPath), "src/app/tokens.css must exist");

  const tokensCss = fs.readFileSync(tokensPath, "utf-8");

  // Regex to extract variable definitions: --token-name: #hex;
  const primitiveRegex = /--(royal-950|royal-900|royal-800|royal-700|royal-chrome|lilac-50|lilac-200|lilac-400|violet-400|violet-600|green-400|red-400|white):\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3});/g;

  const extractedPrimitives: Record<string, string> = {};
  let match: RegExpExecArray | null;
  while ((match = primitiveRegex.exec(tokensCss)) !== null) {
    extractedPrimitives[match[1]] = match[2].toLowerCase();
  }

  // 1. Verify all Layer 1 primitive tokens match exactly
  const primitives: [keyof typeof OG_COLORS, string][] = [
    ["royal950", "royal-950"],
    ["royal900", "royal-900"],
    ["royal800", "royal-800"],
    ["royal700", "royal-700"],
    ["royalChrome", "royal-chrome"],
    ["lilac50", "lilac-50"],
    ["lilac200", "lilac-200"],
    ["lilac400", "lilac-400"],
    ["violet400", "violet-400"],
    ["violet600", "violet-600"],
    ["green400", "green-400"],
    ["red400", "red-400"],
    ["white", "white"],
  ];
  for (const [key, token] of primitives) {
    assert.equal(OG_COLORS[key].toLowerCase(), extractedPrimitives[token], `${token} mismatch`);
  }

  // 2. Verify semantic mappings agree with tokens.css Layer 2 (dark) definitions
  const semantic: [keyof typeof OG_COLORS, string, keyof typeof OG_COLORS][] = [
    ["bgPage", "bg-page", "royal950"],
    ["bgCard", "bg-card", "royal900"],
    ["bgElevated", "bg-elevated", "royal800"],
    ["bgChrome", "bg-chrome", "royalChrome"],
    ["divider", "divider", "royal700"],
    ["textPrimary", "text-primary", "lilac50"],
    ["textMuted", "text-muted", "lilac400"],
    ["accent", "accent", "violet400"],
    ["valueText", "value-text", "violet400"],
    ["trendUp", "trend-up", "green400"],
    ["trendDown", "trend-down", "red400"],
  ];
  for (const [key, token, primitive] of semantic) {
    assert.equal(OG_COLORS[key], OG_COLORS[primitive], `--${token} must map to ${primitive}`);
    const primitiveToken = primitives.find(([k]) => k === primitive)![1];
    assert.ok(
      new RegExp(`--${token}:\\s*var\\(--${primitiveToken}\\);`).test(tokensCss),
      `tokens.css --${token} must be var(--${primitiveToken})`
    );
  }
});

test("Metadata Image URLs: constructMetadata produces fully-qualified absolute OG & Twitter image URLs", () => {
  // 1. Relative dynamic OG image path
  const metaPlayer = constructMetadata({
    title: "Erling Haaland | a1score",
    description: "Player market valuation card",
    path: "/players/erling-haaland",
    image: "/players/erling-haaland/opengraph-image",
  });

  const expectedBase = SITE_URL.replace(/\/$/, "");
  const expectedPlayerOg = `${expectedBase}/players/erling-haaland/opengraph-image`;

  const getOgImg = (meta: ReturnType<typeof constructMetadata>) => {
    const imgs = meta.openGraph?.images;
    if (Array.isArray(imgs) && imgs.length > 0) {
      return imgs[0] as { url: string; width?: number; height?: number };
    }
    return null;
  };

  const getTwImg = (meta: ReturnType<typeof constructMetadata>) => {
    const imgs = meta.twitter?.images;
    if (Array.isArray(imgs) && imgs.length > 0) {
      return String(imgs[0]);
    }
    return null;
  };

  const playerOg = getOgImg(metaPlayer);
  assert.equal(playerOg?.url, expectedPlayerOg);
  assert.equal(playerOg?.width, 1200);
  assert.equal(playerOg?.height, 630);
  assert.equal(getTwImg(metaPlayer), expectedPlayerOg);

  // 2. Club metadata with relative path without leading slash
  const metaClub = constructMetadata({
    title: "Real Madrid | a1score",
    description: "Club valuation profile",
    path: "/clubs/real-madrid",
    image: "clubs/real-madrid/opengraph-image",
  });
  const expectedClubOg = `${expectedBase}/clubs/real-madrid/opengraph-image`;
  assert.equal(getOgImg(metaClub)?.url, expectedClubOg);

  // 3. Fallback when image is omitted
  const metaDefault = constructMetadata({
    title: "Home | a1score",
    description: "Football market intelligence",
  });
  assert.equal(getOgImg(metaDefault)?.url, `${expectedBase}/og-default.png`);

  // 4. Absolute external image is preserved
  const metaExternal = constructMetadata({
    title: "External Asset",
    description: "External image url test",
    image: "https://images.example.com/crest.png",
  });
  assert.equal(getOgImg(metaExternal)?.url, "https://images.example.com/crest.png");
});

test("OG Image Route Specifications: runtime, dimensions, content-type and revalidation headers", () => {
  // Player OG Route Config
  assert.equal(playerRuntime, "edge");
  assert.deepEqual(playerSize, { width: 1200, height: 630 });
  assert.equal(playerContentType, "image/png");
  assert.equal(playerRevalidate, 3600);

  // Club OG Route Config
  assert.equal(clubRuntime, "edge");
  assert.deepEqual(clubSize, { width: 1200, height: 630 });
  assert.equal(clubContentType, "image/png");
  assert.equal(clubRevalidate, 3600);

  // Match OG Route Config
  assert.equal(matchRuntime, "edge");
  assert.deepEqual(matchSize, { width: 1200, height: 630 });
  assert.equal(matchContentType, "image/png");
  assert.equal(matchRevalidate, 60);
});

test("OG Cards Fallback Behavior: Missing photos/crests and unknown IDs render safely without throw", async () => {
  // 1. Player without photo or club crest (fallback to monogram and generic styling)
  const playerResponse = await PlayerOGImage({ params: { slug: "unknown-test-player-999" } });
  assert.ok(playerResponse, "PlayerOGImage must return an ImageResponse");
  assert.equal(playerResponse.status, 200);
  assert.equal(playerResponse.headers.get("content-type"), "image/png");

  // 2. Club without verified honours or logo (fallback to monogram and squad member counts)
  const clubResponse = await ClubOGImage({ params: { id: "unknown-test-club-999" } });
  assert.ok(clubResponse, "ClubOGImage must return an ImageResponse");
  assert.equal(clubResponse.status, 200);
  assert.equal(clubResponse.headers.get("content-type"), "image/png");

  // 3. Match without starting score or unknown match ID (fallback to VS layout and competition badge)
  const matchResponse = await MatchOGImage({ params: { id: "unknown-test-match-999" } });
  assert.ok(matchResponse, "MatchOGImage must return an ImageResponse");
  assert.equal(matchResponse.status, 200);
  assert.equal(matchResponse.headers.get("content-type"), "image/png");
});
