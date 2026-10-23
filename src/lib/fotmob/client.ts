/**
 * src/lib/fotmob/client.ts
 *
 * Edge-compatible FotMob Live Match Intelligence Client
 * Uses authentic dynamic signature protocol (x-mas) with pure-JS MD5 hashing
 * to provide live scores, fixtures, lineups, and match stats with zero external dependencies.
 */

import { formatKickoff } from "@/lib/utils";
import {
  validateFotmobMatches,
  validateFotmobLeague,
  validateFotmobMatchDetails,
} from "@/lib/validation/upstream-shapes";

const FOTMOB_BASE = "https://www.fotmob.com";

const FOTMOB_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.fotmob.com/",
};

const THREE_LIONS_SALT = `[Spoken Intro: Alan Hansen & Trevor Brooking]\nI think it's bad news for the English game\nWe're not creative enough, and we're not positive enough\n\n[Refrain: Ian Broudie & Jimmy Hill]\nIt's coming home, it's coming home, it's coming\nFootball's coming home (We'll go on getting bad results)\nIt's coming home, it's coming home, it's coming\nFootball's coming home\nIt's coming home, it's coming home, it's coming\nFootball's coming home\nIt's coming home, it's coming home, it's coming\nFootball's coming home\n\n[Verse 1: Frank Skinner]\nEveryone seems to know the score, they've seen it all before\nThey just know, they're so sure\nThat England's gonna throw it away, gonna blow it away\nBut I know they can play, 'cause I remember\n\n[Chorus: All]\nThree lions on a shirt\nJules Rimet still gleaming\nThirty years of hurt\nNever stopped me dreaming\n\n[Verse 2: David Baddiel]\nSo many jokes, so many sneers\nBut all those "Oh, so near"s wear you down through the years\nBut I still see that tackle by Moore and when Lineker scored\nBobby belting the ball, and Nobby dancing\n\n[Chorus: All]\nThree lions on a shirt\nJules Rimet still gleaming\nThirty years of hurt\nNever stopped me dreaming\n\n[Bridge]\nEngland have done it, in the last minute of extra time!\nWhat a save, Gordon Banks!\nGood old England, England that couldn't play football!\nEngland have got it in the bag!\nI know that was then, but it could be again\n\n[Refrain: Ian Broudie]\nIt's coming home, it's coming\nFootball's coming home\nIt's coming home, it's coming home, it's coming\nFootball's coming home\n(England have done it!)\nIt's coming home, it's coming home, it's coming\nFootball's coming home\nIt's coming home, it's coming home, it's coming\nFootball's coming home\n[Chorus: All]\n(It's coming home) Three lions on a shirt\n(It's coming home, it's coming) Jules Rimet still gleaming\n(Football's coming home\nIt's coming home) Thirty years of hurt\n(It's coming home, it's coming) Never stopped me dreaming\n(Football's coming home\nIt's coming home) Three lions on a shirt\n(It's coming home, it's coming) Jules Rimet still gleaming\n(Football's coming home\nIt's coming home) Thirty years of hurt\n(It's coming home, it's coming) Never stopped me dreaming\n(Football's coming home\nIt's coming home) Three lions on a shirt\n(It's coming home, it's coming) Jules Rimet still gleaming\n(Football's coming home\nIt's coming home) Thirty years of hurt\n(It's coming home, it's coming) Never stopped me dreaming\n(Football's coming home)`;

// Pure JS MD5 implementation for Edge Runtime (zero Node dependencies)
export function pureMd5(str: string): string {
  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }

  function bitRotateLeft(num: number, cnt: number) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }

  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function binlMD5(x: number[], len: number) {
    x[len >> 5] |= 0x80 << len % 32;
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;

    for (let i = 0; i < x.length; i += 16) {
      const olda = a;
      const oldb = b;
      const oldc = c;
      const oldd = d;

      a = md5ff(a, b, c, d, x[i], 7, -680876936);
      d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = md5gg(b, c, d, a, x[i], 20, -373897302);
      a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

      a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
      d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = md5hh(d, a, b, c, x[i], 11, -358537222);
      c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
      b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

      a = md5ii(a, b, c, d, x[i], 6, -198630844);
      d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
      d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
      b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
      d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
      b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
      d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
      b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

      a = safeAdd(a, olda);
      b = safeAdd(b, oldb);
      c = safeAdd(c, oldc);
      d = safeAdd(d, oldd);
    }
    return [a, b, c, d];
  }

  function rstr2binl(input: string) {
    const output: number[] = Array.from({ length: input.length >> 2 }, () => 0);
    for (let i = 0; i < input.length * 8; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << i % 32;
    }
    return output;
  }

  function binl2hex(binarray: number[]) {
    const hexTab = "0123456789abcdef";
    let str = "";
    for (let i = 0; i < binarray.length * 4; i += 1) {
      str +=
        hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0x0f) +
        hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0x0f);
    }
    return str;
  }

  const utf8 = unescape(encodeURIComponent(str));
  return binl2hex(binlMD5(rstr2binl(utf8), utf8.length * 8));
}

// Generate the authentic FotMob x-mas anti-bot header
export function getXMasHeader(path: string): string {
  const n = {
    url: path,
    code: Date.now(),
    foo: "production:59f198b59eedb9f5fa51f133ae2e05e1c0a4f3ea",
  };
  const signature = pureMd5(JSON.stringify(n) + THREE_LIONS_SALT).toUpperCase();
  const payload = JSON.stringify({ body: n, signature });

  // Base64 encode in Edge/Browser/Node
  if (typeof btoa === "function") {
    return btoa(payload);
  }
  return Buffer.from(payload).toString("base64");
}

import { sanitizeImageUrl } from "@/lib/image-sanitize";

function sanitizeObjectImages<T>(data: T): T {
  return data;
}

export async function fotmobFetch<T = any>(path: string, revalidate = 5): Promise<T | null> {
  const url = `${FOTMOB_BASE}${path}`;
  const xMas = getXMasHeader(path);

  // Retry once on failure or timeout (2 attempts total)
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          ...FOTMOB_HEADERS,
          "x-mas": xMas,
        },
        signal: controller.signal,
        next: { revalidate },
      } as any);

      clearTimeout(timer);

      if (!res.ok) {
        if (attempt === 1 && (res.status === 429 || res.status >= 500)) {
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        console.warn(`[Live Match API] ${path} returned status ${res.status}`);
        return null;
      }

      const json = await res.json();
      return sanitizeObjectImages(json) as T;
    } catch (err: any) {
      clearTimeout(timer);
      if (attempt === 1) {
        // Retry once after brief pause
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      console.warn(`[Live Match API Error] Failed fetching ${path} (attempts exhausted):`, err.message || err);
      return null;
    }
  }

  return null;
}

export interface FotmobTeam {
  id: number;
  name: string;
  longName?: string;
  score?: number;
  imageUrl?: string;
}

export interface FotmobMatch {
  id: number;
  leagueId: number;
  leagueName?: string;
  countryCode?: string;
  time: string;
  timeTS: number;
  home: FotmobTeam;
  away: FotmobTeam;
  status: {
    utcTime: string;
    started: boolean;
    finished: boolean;
    cancelled: boolean;
    scoreStr?: string;
    liveTime?: {
      short?: string;
      long?: string;
    };
    reason?: {
      short?: string;
      long?: string;
    };
  };
  isLive: boolean;
  isFinished: boolean;
  isUpcoming: boolean;
  round?: string;
}

export interface FotmobLeagueGroup {
  id: number;
  name: string;
  ccode: string;
  primaryId?: number;
  matches: FotmobMatch[];
}

/**
 * Fetch matches for a specific date (YYYYMMDD) or today by default
 */
export async function getMatchesByDate(dateStr?: string): Promise<{
  date: string;
  leagues: FotmobLeagueGroup[];
  totalMatches: number;
  liveMatchesCount: number;
}> {
  const dateFormatted =
    dateStr ||
    new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const isPast = dateFormatted < todayStr;
  const isFuture = dateFormatted > todayStr;
  // TTL selection: today is short (30s), future is 300s (5m), past/finished is 86400s (24h)
  const fetchRevalidate = isPast ? 86400 : isFuture ? 300 : 30;

  const path = `/api/data/matches?date=${dateFormatted}`;
  const data = await fotmobFetch<any>(path, fetchRevalidate);

  if (!data) {
    return {
      date: dateFormatted,
      leagues: [],
      totalMatches: 0,
      liveMatchesCount: 0,
    };
  }

  const validation = validateFotmobMatches(data, path);
  if (!validation.success) {
    console.warn(`[FotMob Schema Drift] ${path}: ${validation.error}`);
    if (!Array.isArray(data.leagues)) {
      return {
        date: dateFormatted,
        leagues: [],
        totalMatches: 0,
        liveMatchesCount: 0,
      };
    }
  }

  let totalMatches = 0;
  let liveMatchesCount = 0;

  const leagues: FotmobLeagueGroup[] = data.leagues.map((l: any) => {
    const matches: FotmobMatch[] = (l.matches || []).map((m: any) => {
      totalMatches++;
      const isLive = m.status?.started === true && m.status?.finished !== true && !m.status?.cancelled;
      const isFinished = m.status?.finished === true;
      const isUpcoming = !m.status?.started && !m.status?.finished && !m.status?.cancelled;

      if (isLive) liveMatchesCount++;

      return {
        id: m.id,
        leagueId: l.id || m.leagueId,
        leagueName: l.name,
        countryCode: l.ccode,
        time: m.time,
        timeTS: m.timeTS,
        home: {
          id: m.home?.id,
          name: m.home?.name,
          longName: m.home?.longName || m.home?.name,
          score: m.home?.score ?? 0,
          imageUrl: m.home?.id
            ? sanitizeImageUrl(`https://images.fotmob.com/image_resources/logo/teamlogo/${m.home.id}_small.png`)
            : undefined,
        },
        away: {
          id: m.away?.id,
          name: m.away?.name,
          longName: m.away?.longName || m.away?.name,
          score: m.away?.score ?? 0,
          imageUrl: m.away?.id
            ? sanitizeImageUrl(`https://images.fotmob.com/image_resources/logo/teamlogo/${m.away.id}_small.png`)
            : undefined,
        },
        status: {
          utcTime: m.status?.utcTime,
          started: !!m.status?.started,
          finished: !!m.status?.finished,
          cancelled: !!m.status?.cancelled,
          scoreStr: m.status?.scoreStr,
          liveTime: m.status?.liveTime,
          reason: m.status?.reason,
        },
        isLive,
        isFinished,
        isUpcoming,
        round: m.round || m.roundName || m.stage || undefined,
      };
    });

    return {
      id: l.id || l.primaryId,
      name: l.name,
      ccode: l.ccode,
      primaryId: l.primaryId,
      matches,
    };
  });

  return {
    date: dateFormatted,
    leagues,
    totalMatches,
    liveMatchesCount,
  };
}

export const TOP_LEAGUE_IDS: number[] = [
  47, // Premier League
  87, // LaLiga
  54, // Bundesliga
  55, // Serie A
  53, // Ligue 1
  61, // Liga Portugal
  57, // Eredivisie
  42, // UEFA Champions League
  73, // UEFA Europa League
  10216, // UEFA Conference League
];

export function formatMatchStatus(match: {
  isLive?: boolean;
  isFinished?: boolean;
  isUpcoming?: boolean;
  time?: string | null;
  timeTS?: number | string | null;
  status?: {
    liveTime?: { short?: string | null; long?: string | null } | null;
    reason?: { short?: string | null; long?: string | null } | null;
  } | null;
}): string {
  if (match.isFinished) return "FT";

  const liveShort = match.status?.liveTime?.short?.trim() || "";
  const reasonShort = match.status?.reason?.short?.trim() || "";

  if (
    liveShort.toUpperCase() === "HT" ||
    reasonShort.toUpperCase() === "HT" ||
    liveShort.toLowerCase() === "half time"
  ) {
    return "HT";
  }

  if (match.isLive) {
    if (liveShort) {
      const clean = liveShort.replace(/[^\d+’']/g, "");
      const formattedMin = clean.endsWith("'") ? clean : `${clean}'`;
      return `Live ${formattedMin}`;
    }
    return "Live";
  }

  // Upcoming: format kickoff time with timezone label
  if (match.timeTS) {
    return formatKickoff(match.timeTS, { tz: "UTC" });
  }

  if (match.time) {
    return match.time.includes("UTC") ? match.time : `${match.time} UTC`;
  }

  return "TBD";
}

export const FOTMOB_LEAGUE_MAP: Record<string, number> = {
  GB1: 47, // Premier League
  ES1: 87, // LaLiga
  IT1: 55, // Serie A
  L1: 54,  // Bundesliga
  FR1: 53, // Ligue 1
  NL1: 57, // Eredivisie
  PO1: 61, // Liga Portugal
  CL: 42,  // UEFA Champions League
};

export const OFFICIAL_LEAGUE_CLUB_COUNTS: Record<string, number> = {
  GB1: 20,
  ES1: 20,
  IT1: 20,
  L1: 18,
  FR1: 18,
  NL1: 18,
  PO1: 18,
};

export interface LeagueLegendItem {
  title: string;
  tKey: string;
  color: string;
  indices: number[];
}

export interface LeaguePlayerLeader {
  id: number;
  name: string;
  rank: number;
  teamId: number;
  teamName: string;
  value: number;
  imageUrl?: string;
}

export interface FotmobStandingsRow {
  idx: number;
  id: number;
  name: string;
  shortName?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scoresStr: string;
  goalsFor: number;
  goalsAgainst: number;
  goalConDiff: number;
  pts: number;
  qualColor?: string;
  imageUrl: string;
  form?: Array<{
    result: string;
    score: string;
    opponent: string;
    isHome: boolean;
  }>;
  nextMatch?: {
    opponent: string;
    opponentId?: string | number;
    matchId?: string;
    date?: string;
    isHome?: boolean;
  } | null;
}

/**
 * Fetch official league table & standings
 */
export async function getLeagueStandings(leagueIdOrCode: number | string): Promise<{
  leagueId: number;
  season?: string;
  allAvailableSeasons?: string[];
  teamsCount: number;
  legend?: LeagueLegendItem[];
  topScorers?: LeaguePlayerLeader[];
  topAssists?: LeaguePlayerLeader[];
  standings: FotmobStandingsRow[];
} | null> {
  let fotmobId: number | undefined;

  if (typeof leagueIdOrCode === "number") {
    fotmobId = leagueIdOrCode;
  } else if (!isNaN(Number(leagueIdOrCode))) {
    fotmobId = Number(leagueIdOrCode);
  } else {
    fotmobId = FOTMOB_LEAGUE_MAP[leagueIdOrCode.toUpperCase()] || FOTMOB_LEAGUE_MAP[leagueIdOrCode];
  }

  if (!fotmobId) {
    return null;
  }

  const path = `/api/data/leagues?id=${fotmobId}`;
  const data = await fotmobFetch<any>(path, 300); // 5 min cache for league standings

  if (!data) return null;

  const val = validateFotmobLeague(data, path);
  if (!val.success) {
    console.warn(`[FotMob Schema Drift] ${path}: ${val.error}`);
  }

  const rawTable =
    data.table?.[0]?.data?.table?.all ||
    data.table?.[0]?.data?.tables?.[0]?.table?.all ||
    [];

  const teamForm = data.table?.[0]?.teamForm || data.overview?.table?.[0]?.teamForm || {};
  const nextOpponent = data.table?.[0]?.nextOpponent || {};
  const legend: LeagueLegendItem[] = data.table?.[0]?.data?.legend || [];

  const standings: FotmobStandingsRow[] = rawTable.map((row: any) => {
    const [gfStr, gaStr] = (row.scoresStr || "0-0").split("-");
    const goalsFor = Number(gfStr) || 0;
    const goalsAgainst = Number(gaStr) || 0;

    const rawForm = teamForm[String(row.id)] || [];
    const form = Array.isArray(rawForm)
      ? rawForm.slice(-5).map((f: any) => ({
          result: f.resultString || (f.result === 1 ? "W" : f.result === -1 ? "L" : "D"),
          score: f.score || `${f.tooltipText?.homeScore ?? 0} - ${f.tooltipText?.awayScore ?? 0}`,
          opponent:
            f.tooltipText?.homeTeamId === row.id
              ? f.tooltipText?.awayTeam || "Opponent"
              : f.tooltipText?.homeTeam || "Opponent",
          isHome: f.tooltipText?.homeTeamId === row.id,
        }))
      : [];

    const rawNext = nextOpponent[String(row.id)];
    let nextMatch = null;
    if (Array.isArray(rawNext) && rawNext.length >= 2) {
      nextMatch = {
        opponentId: rawNext[0],
        opponent: rawNext[1],
        matchId: rawNext[2],
        date: rawNext[5],
        isHome: rawNext[3]?.id === String(row.id),
      };
    }

    return {
      idx: row.idx,
      id: row.id,
      name: row.name,
      shortName: row.shortName || row.name,
      played: row.played ?? 0,
      wins: row.wins ?? 0,
      draws: row.draws ?? 0,
      losses: row.losses ?? 0,
      scoresStr: row.scoresStr || "0-0",
      goalsFor,
      goalsAgainst,
      goalConDiff: row.goalConDiff ?? 0,
      pts: row.pts ?? 0,
      qualColor: row.qualColor,
      imageUrl: sanitizeImageUrl(`https://images.fotmob.com/image_resources/logo/teamlogo/${row.id}_small.png`),
      form,
      nextMatch,
    };
  });

  // Extract Top Scorers and Top Assists from stats.players
  let topScorers: LeaguePlayerLeader[] = [];
  let topAssists: LeaguePlayerLeader[] = [];

  if (data.stats?.players) {
    const goalsStat = data.stats.players.find((p: any) => p.name === "goals");
    if (goalsStat?.topThree) {
      topScorers = goalsStat.topThree.map((p: any) => ({
        id: p.id,
        name: p.name,
        rank: p.rank,
        teamId: p.teamId,
        teamName: p.teamName,
        value: p.value ?? p.stat?.value ?? 0,
        imageUrl: sanitizeImageUrl(`https://images.fotmob.com/image_resources/playerimages/${p.id}.png`),
      }));
    }

    const assistStat = data.stats.players.find((p: any) => p.name === "goal_assist");
    if (assistStat?.topThree) {
      topAssists = assistStat.topThree.map((p: any) => ({
        id: p.id,
        name: p.name,
        rank: p.rank,
        teamId: p.teamId,
        teamName: p.teamName,
        value: p.value ?? p.stat?.value ?? 0,
        imageUrl: sanitizeImageUrl(`https://images.fotmob.com/image_resources/playerimages/${p.id}.png`),
      }));
    }
  }

  return {
    leagueId: fotmobId,
    season: data.details?.selectedSeason,
    allAvailableSeasons: data.allAvailableSeasons || [],
    teamsCount: standings.length,
    legend,
    topScorers,
    topAssists,
    standings,
  };
}

/**
 * Search FotMob for players, teams, or leagues
 */
export async function searchFotmob(query: string) {
  if (!query || query.trim().length === 0) return { players: [], teams: [] };

  const path = `/api/data/search/suggest?term=${encodeURIComponent(query.trim())}`;
  const data = await fotmobFetch<any>(path, 60);

  if (!Array.isArray(data)) return { players: [], teams: [] };

  const playersSection = data.find((s: any) => s.title?.key === "players") || data[0];
  const teamsSection = data.find((s: any) => s.title?.key === "teams");

  const players = (playersSection?.suggestions || [])
    .filter((s: any) => s.type === "player")
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      teamId: s.teamId,
      teamName: s.teamName,
      imageUrl: sanitizeImageUrl(`https://images.fotmob.com/image_resources/playerimages/${s.id}.png`),
    }));

  const teams = (teamsSection?.suggestions || [])
    .filter((s: any) => s.type === "team")
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      imageUrl: sanitizeImageUrl(`https://images.fotmob.com/image_resources/logo/teamlogo/${s.id}_small.png`),
    }));

  return { players, teams };
}

export interface FotmobTeamDetails {
  venue?: {
    name: string;
    city?: string;
    capacity?: number;
    surface?: string;
  } | null;
  manager?: {
    name: string;
    season?: string;
  } | null;
  recentForm?: Array<{
    result: string;
    score: string;
    opponent: string;
    date?: string;
  }>;
  nextMatch?: {
    opponent: string;
    date: string;
    tournament: string;
    isHome: boolean;
  } | null;
  leagueTable?: {
    rank: number;
    pts: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    gd: number;
  } | null;
}

export async function getFotmobTeamDetails(teamId: number): Promise<FotmobTeamDetails | null> {
  if (!teamId) return null;
  try {
    const data = await fotmobFetch<any>(`/api/data/teams?id=${teamId}`, 1800);
    if (!data) return null;

    // Venue
    const venueWidget = data.overview?.venue?.widget;
    const statPairs: any[][] = data.overview?.venue?.statPairs || [];
    const capacityPair = statPairs.find((p) => p[0] === "Capacity");
    const surfacePair = statPairs.find((p) => p[0] === "Surface");

    const venue = venueWidget?.name
      ? {
          name: venueWidget.name,
          city: venueWidget.city || undefined,
          capacity: capacityPair ? Number(capacityPair[1]) : undefined,
          surface: surfacePair ? String(surfacePair[1]) : undefined,
        }
      : null;

    // Manager
    const coachHist = data.overview?.coachHistory || [];
    const latestCoach = coachHist[coachHist.length - 1];
    const manager = latestCoach?.name
      ? {
          name: latestCoach.name,
          season: latestCoach.season,
        }
      : null;

    // Recent Form (Last 5)
    let recentForm: any[] = [];
    const teamFormObj =
      data.table?.[0]?.data?.teamForm?.[String(teamId)] ||
      data.overview?.table?.[0]?.teamForm?.[String(teamId)];

    if (Array.isArray(teamFormObj) && teamFormObj.length > 0) {
      recentForm = teamFormObj.slice(-5).map((f: any) => ({
        result: f.resultString || (f.result === 1 ? "W" : f.result === -1 ? "L" : "D"),
        score: f.score || `${f.tooltipText?.homeScore ?? 0} - ${f.tooltipText?.awayScore ?? 0}`,
        opponent:
          f.tooltipText?.homeTeamId === teamId
            ? f.tooltipText?.awayTeam || "Opponent"
            : f.tooltipText?.homeTeam || "Opponent",
        date: f.tooltipText?.utcTime,
      }));
    }

    // Next match
    const nm = data.overview?.nextMatch;
    const nextMatch = nm
      ? {
          opponent: nm.opponent?.name || nm.away?.name || "Opponent",
          date: nm.status?.utcTime || nm.startDay,
          tournament: nm.tournament?.name || "League",
          isHome: nm.home?.id === teamId,
        }
      : null;

    // Table info
    let leagueTable: any = null;
    const allTeams = data.table?.[0]?.data?.table?.all || [];
    const ourTeamRow = allTeams.find((r: any) => r.id === teamId);
    if (ourTeamRow) {
      leagueTable = {
        rank: ourTeamRow.idx,
        pts: ourTeamRow.pts,
        played: ourTeamRow.played,
        wins: ourTeamRow.wins,
        draws: ourTeamRow.draws,
        losses: ourTeamRow.losses,
        gd: ourTeamRow.goalConDiff,
      };
    }

    return {
      venue,
      manager,
      recentForm,
      nextMatch,
      leagueTable,
    };
  } catch (err) {
    console.warn(`[FotMob Client] Failed to fetch team ${teamId}:`, err);
    return null;
  }
}

export interface FotmobSeasonStatRow {
  id: string;
  season: string;
  competition: string;
  clubName: string;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
  minutesPlayed: number | null;
  yellowCards: number | null;
  redCards: number | null;
  rating: number | null;
}

/**
 * Fetch player performance intelligence and career tournament breakdown
 */
export async function getFotmobPlayerStats(playerNameOrId: string | number) {
  let fotmobId: string | number | null = null;

  if (typeof playerNameOrId === "number" || !isNaN(Number(playerNameOrId))) {
    fotmobId = playerNameOrId;
  } else {
    const searchRes = await searchFotmob(String(playerNameOrId));
    if (searchRes.players.length > 0) {
      fotmobId = searchRes.players[0].id;
    }
  }

  if (!fotmobId) return null;

  const path = `/api/data/playerData?id=${fotmobId}`;
  const data = await fotmobFetch<any>(path, 600); // 10 min cache for player stats

  if (!data) return null;

  const seasonStatsList: FotmobSeasonStatRow[] = [];

  // Missing numbers stay null (never 0) and rows without a team, season or
  // competition are skipped rather than labelled with placeholders.
  const countOrNull = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const ratingOrNull = (r: any): number | null => {
    const n = countOrNull(r?.rating);
    return n != null && n > 0 ? n : null;
  };
  const textOrNull = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const seniorCareer = data.careerHistory?.careerItems?.senior;
  if (seniorCareer && Array.isArray(seniorCareer.teamEntries)) {
    for (const teamEntry of seniorCareer.teamEntries) {
      const teamName = textOrNull(teamEntry?.team);
      if (!teamName) continue;
      const seasonEntries = Array.isArray(teamEntry.seasonEntries) ? teamEntry.seasonEntries : [];

      for (const season of seasonEntries) {
        const seasonName = textOrNull(season?.seasonName);
        if (!seasonName) continue;
        const tournamentStats = Array.isArray(season.tournamentStats) ? season.tournamentStats : [];

        if (tournamentStats.length > 0) {
          for (const tour of tournamentStats) {
            const competition = textOrNull(tour?.leagueName);
            if (!competition) continue;
            seasonStatsList.push({
              id: `fotmob-${fotmobId}-${tour.leagueId || tour.tournamentId}-${seasonName}`,
              season: seasonName,
              competition,
              clubName: teamName,
              appearances: countOrNull(tour.appearances),
              goals: countOrNull(tour.goals),
              assists: countOrNull(tour.assists),
              minutesPlayed: null,
              yellowCards: null,
              redCards: null,
              rating: ratingOrNull(tour.rating),
            });
          }
        } else {
          seasonStatsList.push({
            id: `fotmob-${fotmobId}-${seasonName}`,
            season: seasonName,
            competition: "All Competitions",
            clubName: teamName,
            appearances: countOrNull(season.appearances),
            goals: countOrNull(season.goals),
            assists: countOrNull(season.assists),
            minutesPlayed: null,
            yellowCards: null,
            redCards: null,
            rating: ratingOrNull(season.rating),
          });
        }
      }
    }
  }

  return {
    id: fotmobId,
    name: data.name,
    position: data.positionDescription?.primaryPosition?.label || null,
    injury: data.injuryInformation || null,
    seasonStats: seasonStatsList,
    statsSection: data.statsSection || null,
  };
}

/**
 * Fetch detailed match intelligence: lineups, events, and stats
 * With automated event reconciliation for card count discrepancies.
 */
export async function getMatchDetails(matchId: string | number) {
  const path = `/api/data/matchDetails?matchId=${matchId}`;
  const data = await fotmobFetch<any>(path, 5); // 5s cache for live match details and lineups

  if (!data) return null;

  const val = validateFotmobMatchDetails(data, path);
  if (!val.success) {
    console.warn(`[FotMob Schema Drift] ${path}: ${val.error}`);
  }

  const general = data.general || {};
  const header = data.header || {};
  const content = data.content || {};

  const events = content.matchFacts?.events?.events || [];
  const stats = content.stats?.Periods?.All?.stats || [];

  // Card reconciliation: count on-pitch card events vs stats card aggregate
  const onPitchYellowCards = events.filter((e: any) => e.type === "Card" && e.card === "Yellow").length;
  const onPitchRedCards = events.filter((e: any) => e.type === "Card" && (e.card === "Red" || e.card === "YellowRed")).length;

  // Extract goal scorers for home and away
  const goalEvents = events.filter((e: any) => e.type === "Goal");
  const homeGoalsMap = new Map<string, string[]>();
  const awayGoalsMap = new Map<string, string[]>();

  for (const g of goalEvents) {
    const pName = g.player?.name || g.name || g.nameStr || "Goal";
    let minuteStr = `${g.time ?? ""}'`;
    if (g.overloadTime) {
      minuteStr = `${g.time}+${g.overloadTime}'`;
    }
    if (g.ownGoal || g.isOwnGoal || g.shotType === "OwnGoal") {
      minuteStr += " (OG)";
    } else if (g.isPenalty || g.shotType === "Penalty") {
      minuteStr += " (P)";
    }

    if (g.isHome) {
      if (!homeGoalsMap.has(pName)) homeGoalsMap.set(pName, []);
      homeGoalsMap.get(pName)!.push(minuteStr);
    } else {
      if (!awayGoalsMap.has(pName)) awayGoalsMap.set(pName, []);
      awayGoalsMap.get(pName)!.push(minuteStr);
    }
  }

  const homeScorers = Array.from(homeGoalsMap.entries()).map(([player, minutes]) => ({
    player,
    minutes: minutes.join(", "),
  }));

  const awayScorers = Array.from(awayGoalsMap.entries()).map(([player, minutes]) => ({
    player,
    minutes: minutes.join(", "),
  }));

  const isStarted = !!general.started || !!header.status?.started;
  const isFinished = !!general.finished || !!header.status?.finished;
  const isCancelled = !!general.cancelled || !!header.status?.cancelled;
  const liveTimeShort = header.status?.liveTime?.short || "";
  const isHT =
    liveTimeShort.includes("HT") ||
    header.status?.reason?.short === "HT" ||
    (header.status?.halfs?.firstHalfEnded && !header.status?.halfs?.secondHalfStarted);

  let standings: FotmobStandingsRow[] = [];
  const targetLeagueId =
    general.parentLeagueId ||
    general.leagueId ||
    content.table?.parentLeagueId ||
    content.table?.leagueId;

  if (targetLeagueId) {
    try {
      const standingsData = await getLeagueStandings(targetLeagueId);
      if (standingsData && standingsData.standings) {
        standings = standingsData.standings;
      }
    } catch {
      // ignore
    }
  }

  return {
    id: matchId,
    general: {
      matchId: general.matchId || matchId,
      matchName: general.matchName,
      leagueId: general.leagueId,
      leagueName: general.leagueName,
      matchRound: general.matchRound,
      countryCode: general.countryCode,
      started: isStarted,
      finished: isFinished,
      cancelled: isCancelled,
      matchTimeUTC: general.matchTimeUTC,
      matchTimeUTCDate: general.matchTimeUTCDate || header.status?.utcTime,
      teamColors: general.teamColors,
    },
    status: {
      started: isStarted,
      finished: isFinished,
      cancelled: isCancelled,
      isLive: isStarted && !isFinished && !isCancelled,
      isHT: !!isHT,
      isUpcoming: !isStarted && !isFinished && !isCancelled,
      scoreStr:
        header.status?.scoreStr ||
        (isStarted ? `${header.teams?.[0]?.score ?? 0} - ${header.teams?.[1]?.score ?? 0}` : "vs"),
      liveTime: header.status?.liveTime || null,
      reason: header.status?.reason || null,
    },
    teams: {
      home: header.teams?.[0]
        ? {
            id: header.teams[0].id,
            name: header.teams[0].name,
            score: header.teams[0].score ?? 0,
            imageUrl: sanitizeImageUrl(header.teams[0].imageUrl),
            fifaRank: header.teams[0].fifaRank || null,
            totalStarterMarketValue: content.lineup?.homeTeam?.totalStarterMarketValue || null,
          }
        : null,
      away: header.teams?.[1]
        ? {
            id: header.teams[1].id,
            name: header.teams[1].name,
            score: header.teams[1].score ?? 0,
            imageUrl: sanitizeImageUrl(header.teams[1].imageUrl),
            fifaRank: header.teams[1].fifaRank || null,
            totalStarterMarketValue: content.lineup?.awayTeam?.totalStarterMarketValue || null,
          }
        : null,
    },
    scorers: {
      home: homeScorers,
      away: awayScorers,
      totalCount: homeScorers.length + awayScorers.length,
    },
    events,
    lineup: content.lineup ? sanitizeObjectImages(content.lineup) : null,
    stats,
    infoBox: content.matchFacts?.infoBox
      ? {
          tournament: content.matchFacts.infoBox.Tournament || null,
          stadium: content.matchFacts.infoBox.Stadium || null,
          referee: content.matchFacts.infoBox.Referee || null,
          attendance: content.matchFacts.infoBox.Attendance || null,
          matchDate: content.matchFacts.infoBox["Match Date"] || null,
        }
      : null,
    h2h: content.h2h
      ? {
          summary: content.h2h.summary || [0, 0, 0],
          matches: content.h2h.matches || [],
        }
      : null,
    teamForm: content.matchFacts?.teamForm || null,
    table: {
      leagueName: general.leagueName,
      standings,
      hasTable: standings.length > 0,
    },
    shotmap: content.shotmap
      ? {
          shots: content.shotmap.shots || [],
          periods: content.shotmap.Periods || null,
        }
      : null,
    hasCommentary: false,
    cardReconciliation: {
      onPitchYellowCards,
      onPitchRedCards,
    },
  };
}

