# A1score native app: API contract (v1)

This is what the native app calls. Every response is JSON with the envelope `{ "success": true, "data": …, "meta"?: … }`.

- Base URL: `https://a1score.app/api`
- Money is integer EUR (`valueEur`). The app converts it with `/fx`.
- Times are ISO 8601 UTC. The app formats them in the user's local zone.

**Source legend**
- **EXISTS**: the route is already in `a1score.app`.
- **EXTEND**: the route exists but needs fields added.
- **NEW**: a new route over data A1score already has.
- **LICENSED**: needs a licensed feed (odds via The Odds API or Sportmonks; stats via API-Football or Sportmonks).

The field naming copies the useful *ideas* from Flashscore's model (status codes, current vs opening odds, per-match tab availability), not their keys or feeds.

---

## Shared types

```ts
type MatchStatus = "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled";

interface TeamRef   { id: string; name: string; shortName?: string; crestUrl: string | null }
interface LeagueRef { id: string; name: string; country: string; countryCode: string; logoUrl: string | null }

interface MatchSummary {
  id: string;
  league: LeagueRef;
  round?: string;                       // "Round 8"
  kickoff: string;                      // ISO UTC
  status: MatchStatus;
  minute?: string;                      // "41'", "45+2'", "HT"
  home: TeamRef & { score: number | null; redCards?: number };
  away: TeamRef & { score: number | null; redCards?: number };
  winner?: "home" | "away" | "draw";    // finished only, for bold name
  hasPreview?: boolean;                 // "PREVIEW" badge
  odds?: Odds1x2 | null;                // only when the user enables odds
}

interface OddsValue { current: number; opening: number; move: "up" | "down" | "none" }
interface Odds1x2   { bookmaker: string; home: OddsValue; draw: OddsValue; away: OddsValue }

interface ValuePoint { date: string; valueEur: number; clubName?: string }
interface ValueTrend { diffEur: number; pct: number | null; since: string } // ▲/▼ arrows
```

---

## 1. Matches

| Method & path | Screen / component | Source |
|---|---|---|
| `GET /matches?date=YYYYMMDD&filter=all\|live\|finished\|upcoming` | All Games, Live tab, date picker | **EXISTS**: re-map FotMob to `MatchSummary`, grouped `{ league, matches[] }[]` |
| `GET /matches/odds?date=YYYYMMDD` | Odds column (merged by match `id`) | **LICENSED** odds. Separate endpoint so the list never waits on odds |
| `GET /matches/{id}` | Score header, breadcrumb, `tabs[]` | **EXISTS**: add `tabs: ("summary"\|"stats"\|"lineups"\|"value"\|"h2h"\|"standings"\|"news")[]` so the app shows only tabs with data |
| `GET /matches/{id}/stats?period=all\|1h\|2h` | Stats tab and its chips | **EXTEND**: return the FotMob `FirstHalf`/`SecondHalf` periods as well |
| `GET /matches/{id}/lineups` | Lineups tab, pitch, subs, missing players | **EXISTS** (inside `/matches/{id}`). It can stay embedded |
| `GET /matches/{id}/h2h` | H2H tab and W/D/L badges | **EXISTS** (embedded) |
| `GET /matches/{id}/value` | **Market Value tab** | **NEW**: see below |

`/matches/{id}/value` response:
```ts
{
  home: { xiValueEur: number; benchValueEur: number; avgPlayerEur: number; mostValuable: PlayerValueRow },
  away: { …same },
  xi:   { home: PlayerValueRow[]; away: PlayerValueRow[] }   // sorted by value desc
}
interface PlayerValueRow {
  id: string; slug: string; name: string; photoUrl: string | null;
  position: string; age: number | null;
  club: TeamRef; valueEur: number; trend: ValueTrend | null;
}
```
Build it by matching lineup players to A1score players (`getDbPlayerByTransfermarktId` / name+club fallback).

## 2. Market value

| Method & path | Screen / component | Source |
|---|---|---|
| `GET /players/most-valuable?position=&league=&page=&limit=` | Ranking, PLAYERS chip, filters | **EXTEND**: add a `league` param and a `trend` field on each row |
| `GET /players/movers?direction=up\|down&period=6m&limit=` | RISING chip, home risers | **NEW** over `getMarketValueMovers()` |
| `GET /clubs/most-valuable?league=&limit=` | CLUBS chip | **NEW** over `getTopClubs()` / `ClubValueSnapshot` |
| `GET /players/{id}` | Player page: value card, history chart, highest value, change | **EXISTS**: confirm it returns `history: ValuePoint[]`, `peak`, `trend` |
| `GET /players/{id}/rank` | "Rank in league" fact row | **NEW**: `{ league: LeagueRef, rank: number, of: number }` |

## 3. Leagues

| Method & path | Screen / component | Source |
|---|---|---|
| `GET /leagues` | Leagues list | **EXISTS** |
| `GET /leagues/{id}?season=` | League header, season picker, progress bar | **NEW**: `{ league, season, seasons: string[], startDate, endDate }` |
| `GET /leagues/{id}/standings?season=&view=overall\|home\|away\|form` | Standings tab and chips | **NEW** over `getLeagueStandings()`. Add `season`; home/away need mapping |
| `GET /leagues/{id}/fixtures?season=&round=` | Fixtures and results tabs | **NEW** |
| `GET /leagues/{id}/value` | League MARKET VALUE tab | **NEW**: clubs by squad value plus the top 10 players |

Standings row:
```ts
{ pos: number; zone: "ucl"|"uel"|"uecl"|"playoff"|"relegation"|null;
  team: TeamRef; played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; points: number;
  form?: ("W"|"D"|"L")[]; liveScore?: string }
```

## 4. Clubs, news, search, user

| Method & path | Screen / component | Source |
|---|---|---|
| `GET /clubs/{id}` | Team page, SQUAD VALUE tab | **EXISTS** |
| `GET /news?category=` | News tabs and list | **EXISTS** |
| `GET /search?q=&type=player\|club\|league` | Search across everything | **NEW** (players-only `/players/search` exists) |
| Supabase `user_follows`, `user_settings` | Favourite stars, settings sync | **EXISTS**: the app uses `supabase-js` directly, with sign-in required to sync |
| `POST /notifications/subscribe`, `/unsubscribe` | Notification settings | **EXISTS**: register FCM/APNs tokens |
| `GET /fx` | Currency conversion | **EXISTS** |
| `GET /app-config` | Feature flags (for example `oddsEnabled`), minimum app version | **EXISTS** |

## 5. Live updates

- **v1 (simple):** poll `/matches?filter=live` every 15 s while a list is visible, and `/matches/{id}` every 10 s on a live detail screen. Both already send `ETag`, so unchanged polls cost a `304`.
- **v2:** a server-sent events stream (`GET /live/stream`) that pushes `MatchSummary` deltas. Cloudflare can host it with Durable Objects.

## 6. Caching (already in place, keep it)

| Data | Edge TTL |
|---|---|
| Live match list | 30 s |
| Today's list | 60 s |
| Past days | 24 h |
| Match detail | 5 s |
| Valuations | 1 h (they change rarely) |
| News | 5 min |

## Priority order

1. Re-map `/matches` and `/matches/{id}` to the shared types, and add `tabs[]`.
2. `/leagues/{id}` and `/leagues/{id}/standings`.
3. `/matches/{id}/value`, `/players/movers`, `/clubs/most-valuable`, and `league` + `trend` on most-valuable.
4. `/search` and the `/stats?period=` half-time stats.
5. Licensed odds behind the `oddsEnabled` flag.
