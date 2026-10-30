import { ImageResponse } from "next/og";
import { OG_COLORS } from "@/lib/og/colors";
import { getRanking } from "@/lib/rankings";
import { getRankedPlayers } from "@/lib/data/rankings";
import { formatValueEur } from "@/lib/format-value";

export const runtime = "edge";
export const alt = "a1score player ranking by market value";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const def = getRanking(params.slug);
  const players = def ? await getRankedPlayers(def, 5) : [];
  const heading = def?.heading ?? "Player rankings";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          backgroundColor: OG_COLORS.bgPage,
          color: OG_COLORS.textPrimary,
          padding: "56px 72px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: OG_COLORS.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: OG_COLORS.accentContrast,
              fontWeight: 900,
              fontSize: "20px",
            }}
          >
            A1
          </div>
          <span style={{ fontSize: "26px", fontWeight: 800 }}>a1score</span>
        </div>

        <h1 style={{ fontSize: "54px", fontWeight: 900, lineHeight: 1.1, margin: "28px 0 24px", letterSpacing: "-1px" }}>
          {heading}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {players.map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "28px",
                borderBottom: `1px solid ${OG_COLORS.divider}`,
                paddingBottom: "8px",
              }}
            >
              <span style={{ display: "flex", gap: "18px" }}>
                <span style={{ color: OG_COLORS.textMuted, width: "32px" }}>{idx + 1}</span>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
              </span>
              <span style={{ color: OG_COLORS.valueText, fontWeight: 800 }}>{formatValueEur(p.marketValue) ?? ""}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
