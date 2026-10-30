import { ImageResponse } from "next/og";
import { OG_COLORS } from "@/lib/og/colors";

export const runtime = "edge";
export const alt = "Football Clubs Directory — Squad Market Capital & Rankings";
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
          backgroundImage: `radial-gradient(circle at 25px 25px, ${OG_COLORS.divider} 2%, transparent 0%)`,
          backgroundSize: "40px 40px",
          color: OG_COLORS.white,
          padding: "60px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", width: "100%" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: `linear-gradient(135deg, ${OG_COLORS.accent}, ${OG_COLORS.accentStrong})`,
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
          <span style={{ fontSize: "28px", fontWeight: 800, color: OG_COLORS.white }}>
            a1score<span style={{ color: OG_COLORS.accent }}>.app</span>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
          <span
            style={{
              color: OG_COLORS.accent,
              fontSize: "18px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "3px",
              marginBottom: "12px",
            }}
          >
            Squad Capital Directory
          </span>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 900,
              lineHeight: 1.1,
              margin: 0,
              color: OG_COLORS.textPrimary,
              letterSpacing: "-1px",
            }}
          >
            Football Clubs Directory & Squad Valuations
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
            Cumulative squad market values, 4-tier squad pyramids, First Team player counts, and commercial transfer ledgers across 240+ clubs.
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
          <span>Senior First-Team De-inflated Rosters</span>
          <span>Europe&apos;s Top 7 Competitions</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
