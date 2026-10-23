import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, DRAWER_ITEMS } from "../src/components/Navbar";

test("Navbar CATEGORIES highlights the correct tab across detail and list routes", () => {
  const getActiveCategories = (path: string, filter: string | null = null) =>
    CATEGORIES.filter((c) => c.isActive(path, filter)).map((c) => c.name);

  // 1. Matches list & detail page
  assert.deepEqual(getActiveCategories("/matches"), ["Matches"]);
  assert.deepEqual(getActiveCategories("/matches/443322"), ["Matches"]);
  assert.deepEqual(getActiveCategories("/matches/mancity-vs-arsenal"), ["Matches"]);

  // 2. Players list & detail page
  assert.deepEqual(getActiveCategories("/players"), ["Players"]);
  assert.deepEqual(getActiveCategories("/players/erling-haaland-12345"), ["Players"]);

  // 3. Clubs list & detail page
  assert.deepEqual(getActiveCategories("/clubs"), ["Clubs"]);
  assert.deepEqual(getActiveCategories("/clubs/manchester-city"), ["Clubs"]);
  assert.deepEqual(getActiveCategories("/clubs/11"), ["Clubs"]);

  // 4. Leagues list & detail page
  assert.deepEqual(getActiveCategories("/leagues"), ["Leagues"]);
  assert.deepEqual(getActiveCategories("/leagues/premier-league"), ["Leagues"]);
  assert.deepEqual(getActiveCategories("/leagues/GB1"), ["Leagues"]);

  // 5. Market Values & search?filter=valuable
  assert.deepEqual(getActiveCategories("/values"), ["Market Values"]);
  assert.deepEqual(getActiveCategories("/search", "valuable"), ["Market Values"]);

  // 6. Transfers
  assert.deepEqual(getActiveCategories("/transfers"), ["Transfers"]);
  assert.deepEqual(getActiveCategories("/transfers/summer-2024"), ["Transfers"]);
});

test("Navbar DRAWER_ITEMS highlights the correct item across detail and list routes", () => {
  const getActiveDrawerItems = (path: string, filter: string | null = null) =>
    DRAWER_ITEMS.filter((item) => item.isActive(path, filter)).map((item) => item.name);

  assert.deepEqual(getActiveDrawerItems("/"), ["Home"]);
  assert.deepEqual(getActiveDrawerItems("/matches/12345"), ["Live Matches"]);
  assert.deepEqual(getActiveDrawerItems("/players/erling-haaland-123"), ["Players"]);
  assert.deepEqual(getActiveDrawerItems("/clubs/chelsea-fc"), ["Clubs"]);
  assert.deepEqual(getActiveDrawerItems("/leagues/L1"), ["Leagues"]);
  assert.deepEqual(getActiveDrawerItems("/following"), ["Following"]);
  assert.deepEqual(getActiveDrawerItems("/watchlist"), ["Following"]);
});
