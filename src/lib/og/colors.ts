/**
 * src/lib/og/colors.ts
 *
 * Design token hex mappings for Next.js ImageResponse (@vercel/og / next/og).
 * Edge runtime ImageResponse cannot evaluate CSS variables (var(--...)), so
 * this file serves as the canonical static mapping strictly verified against
 * src/app/tokens.css by tests/share-cards.test.ts. Share cards use the dark
 * Royal theme.
 *
 * NOTE: This is the ONLY file in the codebase where raw hex codes are permitted.
 * Whitelisted explicitly in scripts/check-hardcoded-colors.ts.
 */

export const OG_COLORS = {
  // Primitives from tokens.css Layer 1
  royal950: "#0f0a1f",
  royal900: "#1a1330",
  royal800: "#241a40",
  royal700: "#2a2145",
  royalChrome: "#1e1240",
  lilac50: "#f4f1ff",
  lilac200: "#c4bdd9",
  lilac400: "#9a92b3",
  violet400: "#a78bfa",
  violet600: "#7c3aed",
  green400: "#32d583",
  red400: "#f97066",
  white: "#ffffff",

  // Semantic tokens mapped from Layer 2 (dark)
  bgPage: "#0f0a1f",
  bgCard: "#1a1330",
  bgElevated: "#241a40",
  bgChip: "#241a40",
  bgChrome: "#1e1240",
  divider: "#2a2145",
  textPrimary: "#f4f1ff",
  textSecondary: "#c4bdd9",
  textMuted: "#9a92b3",
  accent: "#a78bfa",
  accentStrong: "#7c3aed",
  accentContrast: "#0f0a1f",
  valueText: "#a78bfa",
  trendUp: "#32d583",
  trendDown: "#f97066",
} as const;

export type OgColorKey = keyof typeof OG_COLORS;
