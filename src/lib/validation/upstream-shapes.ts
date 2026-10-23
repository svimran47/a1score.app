/**
 * src/lib/validation/upstream-shapes.ts
 *
 * Lightweight runtime response-shape validation for upstream APIs (FotMob & Transfermarkt).
 * Rejects and logs malformed or drifted data at the boundary before it corrupts application state.
 */

import { z } from "zod";

// ==========================================
// 1. FotMob Upstream Schemas
// ==========================================

export const FotmobMatchItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  home: z.object({
    name: z.string().optional(),
    id: z.union([z.string(), z.number()]).optional(),
    score: z.number().optional(),
  }).passthrough().optional(),
  away: z.object({
    name: z.string().optional(),
    id: z.union([z.string(), z.number()]).optional(),
    score: z.number().optional(),
  }).passthrough().optional(),
  status: z.object({
    started: z.boolean().optional(),
    finished: z.boolean().optional(),
    scoreStr: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

export const FotmobMatchesResponseSchema = z.object({
  leagues: z.array(z.record(z.any())).optional(),
}).passthrough();

export const FotmobMatchDetailsSchema = z.object({
  general: z.object({
    matchId: z.union([z.string(), z.number()]).optional(),
    leagueName: z.string().optional(),
  }).passthrough().optional(),
  header: z.object({
    teams: z.array(z.any()).optional(),
    status: z.any().optional(),
  }).passthrough().optional(),
}).passthrough();

// ==========================================
// 2. Transfermarkt Upstream Schemas
// ==========================================

export const TmMarketValuePointSchema = z.object({
  y: z.union([z.number(), z.string()]),
  x: z.union([z.number(), z.string()]).optional(),
  datum_mw: z.string().optional(),
  verein: z.string().optional(),
  age: z.union([z.number(), z.string()]).optional(),
  mw: z.string().optional(),
}).passthrough();

export const TmMarketValueGraphSchema = z.object({
  list: z.array(TmMarketValuePointSchema),
}).passthrough();

export const TmTransferItemSchema = z.object({
  season: z.string().optional(),
  date: z.string().optional(),
  dateUnformatted: z.string().optional(),
  from: z.union([z.string(), z.object({ clubName: z.string().optional() }).passthrough()]).optional(),
  to: z.union([z.string(), z.object({ clubName: z.string().optional() }).passthrough()]).optional(),
  fee: z.string().optional(),
}).passthrough();

export const TmTransferHistorySchema = z.object({
  transfers: z.array(TmTransferItemSchema).optional(),
}).passthrough();

export const TmPlayerSearchItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  club: z.string().optional(),
}).passthrough();

export const TmPlayerSearchResponseSchema = z.object({
  players: z.array(TmPlayerSearchItemSchema).optional(),
}).passthrough();

// ==========================================
// 3. Schema Drift State Store
// ==========================================

export interface SchemaDriftRecord {
  hasDrift: boolean;
  source: "fotmob" | "transfermarkt" | "database";
  endpoint: string;
  errorMessage: string;
  timestamp: string;
}

const recentDriftRecords: Record<string, SchemaDriftRecord> = {};

export function recordSchemaDrift(
  source: "fotmob" | "transfermarkt" | "database",
  endpoint: string,
  errorMessage: string
): void {
  const key = `${source}:${endpoint}`;
  recentDriftRecords[key] = {
    hasDrift: true,
    source,
    endpoint,
    errorMessage,
    timestamp: new Date().toISOString(),
  };
  console.warn(
    `[Schema Drift Detected] Source: ${source} | Endpoint: ${endpoint} | Error: ${errorMessage}`
  );
}

export function clearSchemaDrift(source?: "fotmob" | "transfermarkt" | "database"): void {
  if (source) {
    for (const key of Object.keys(recentDriftRecords)) {
      if (recentDriftRecords[key].source === source) {
        delete recentDriftRecords[key];
      }
    }
  } else {
    for (const key of Object.keys(recentDriftRecords)) {
      delete recentDriftRecords[key];
    }
  }
}

export function getSchemaDriftStatus(source: "fotmob" | "transfermarkt" | "database"): SchemaDriftRecord | null {
  for (const key of Object.keys(recentDriftRecords)) {
    if (recentDriftRecords[key].source === source && recentDriftRecords[key].hasDrift) {
      return recentDriftRecords[key];
    }
  }
  return null;
}

// ==========================================
// 4. Safe Validation Boundary Functions
// ==========================================

export function validateFotmobMatches(raw: unknown, endpoint = "/api/data/matches") {
  const result = FotmobMatchesResponseSchema.safeParse(raw);
  if (!result.success) {
    const errorMsg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    recordSchemaDrift("fotmob", endpoint, errorMsg);
    return { success: false as const, error: errorMsg, data: null };
  }
  return { success: true as const, data: result.data, error: null };
}

export const FotmobLeagueResponseSchema = z.object({
  table: z.array(z.any()).optional(),
  details: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

export function validateFotmobLeague(raw: unknown, endpoint = "/api/leagues") {
  const result = FotmobLeagueResponseSchema.safeParse(raw);
  if (!result.success) {
    const errorMsg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    recordSchemaDrift("fotmob", endpoint, errorMsg);
    return { success: false as const, error: errorMsg, data: null };
  }
  return { success: true as const, data: result.data, error: null };
}

export function validateFotmobMatchDetails(raw: unknown, endpoint = "/api/matchDetails") {
  const result = FotmobMatchDetailsSchema.safeParse(raw);
  if (!result.success) {
    const errorMsg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    recordSchemaDrift("fotmob", endpoint, errorMsg);
    return { success: false as const, error: errorMsg, data: null };
  }
  return { success: true as const, data: result.data, error: null };
}

export function validateTmMarketValueGraph(raw: unknown, endpoint = "/ceapi/marketValueDevelopment/graph") {
  const result = TmMarketValueGraphSchema.safeParse(raw);
  if (!result.success) {
    const errorMsg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    recordSchemaDrift("transfermarkt", endpoint, errorMsg);
    return { success: false as const, error: errorMsg, data: null };
  }
  return { success: true as const, data: result.data, error: null };
}

export function validateTmTransferHistory(raw: unknown, endpoint = "/ceapi/transferHistory/list") {
  const result = TmTransferHistorySchema.safeParse(raw);
  if (!result.success) {
    const errorMsg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    recordSchemaDrift("transfermarkt", endpoint, errorMsg);
    return { success: false as const, error: errorMsg, data: null };
  }
  return { success: true as const, data: result.data, error: null };
}
