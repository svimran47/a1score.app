import { ImageResponse } from "next/og";
import { OG_COLORS } from "@/lib/og/colors";

export const runtime = "edge";
export const alt = "Matches — Scores, Lineups & Squad Values";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: "column",
          backgroundColor: OG_COLORS.bgPage,
          color: OG_COLORS.textPrimary,
          padding: "60px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", width: "100%" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: OG_COLORS.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: OG_COLORS.bgPage,
              fontWeight: 900,
              fontSize: "24px",
            }}
          >
            A1
          </div>
          <span style={{ fontSize: "28px", fontWeight: 800, color: OG_COLORS.textPrimary }}>
            a1score<span style={{ color: OG_COLORS.accent }}>.app</span>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
          <span
            style={{
              color: OG_COLORS.accent,
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Match scores & squad values
          </span>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 600,
              lineHeight: 1.1,
              margin: 0,
              color: OG_COLORS.textPrimary,
              letterSpacing: "-1px",
            }}
          >
            Matches & Squad Values
          </h1>
          <p
            style={{
              fontSize: "22px",
              color: OG_COLORS.textMuted,
              marginTop: "16px",
              marginBottom: 0,
              lineHeight: 1.4,
            }}
          >
            In-play match events, confirmed starting lineups, and squad market values across European competitions.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: `1px solid ${OG_COLORS.divider}`,
            paddingTop: "24px",
            fontSize: "16px",
            color: OG_COLORS.textMuted,
          }}
        >
          <span>Tactical 2D Pitch Lineups • OPTA Match Stats</span>
          <span>Edge Auto-Refresher • Tabular Numerals</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
