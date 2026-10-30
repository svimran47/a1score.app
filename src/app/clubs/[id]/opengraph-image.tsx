import React from "react";
import { ImageResponse } from "next/og";
import { getClubById } from "@/lib/data/clubs";
import { getClubHonours } from "@/lib/data/honours";
import { formatCompactEur } from "@/lib/utils";
import { OG_COLORS } from "@/lib/og/colors";

export const runtime = "edge";
export const alt = "Club Squad Valuation & Honours | a1score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600; // Hourly revalidation

function getInitials(name: string): string {
  if (!name) return "FC";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default async function Image({ params }: { params: { id: string } }) {
  const resolvedParams = await Promise.resolve(params);
  const club = await getClubById(resolvedParams.id).catch(() => null);

  const clubName = club?.name || resolvedParams.id.replace(/-/g, " ");
  const logoUrl = club?.logoUrl;
  const leagueName = club?.league?.name || "Top Division Football";
  const squadVal = club?.totalSquadValue ? Number(club.totalSquadValue) : 0;
  const formattedVal = squadVal > 0 ? formatCompactEur(squadVal) : "Pending";
  const squadSize = club?.squadSize || club?.seniorSquad?.length || 0;

  // Verified official honours
  const honours = club?.id ? await getClubHonours(club.id).catch(() => []) : [];
  const totalHonours = honours.reduce((sum, h) => sum + (Number(h.titleCount) || 0), 0);
  const uclHonour = honours.find((h) => h.competitionKey === "ucl");
  const leagueHonour = honours.find((h) => h.competitionKey === "domestic_league");

  const initials = getInitials(clubName);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: OG_COLORS.bgPage,
          backgroundImage: `radial-gradient(circle at 25px 25px, ${OG_COLORS.divider} 1.5%, transparent 0%)`,
          backgroundSize: "40px 40px",
          padding: "48px 56px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: OG_COLORS.textPrimary,
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: `linear-gradient(135deg, ${OG_COLORS.accent}, ${OG_COLORS.accentStrong})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: OG_COLORS.bgPage,
                fontWeight: 900,
                fontSize: "22px",
              }}
            >
              A1
            </div>
            <span style={{ fontSize: "26px", fontWeight: 800, color: OG_COLORS.white }}>
              a1score<span style={{ color: OG_COLORS.accent }}>.app</span>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "999px",
              backgroundColor: OG_COLORS.bgElevated,
              border: `1px solid ${OG_COLORS.divider}`,
              color: OG_COLORS.accent,
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            Club Squad Intelligence
          </div>
        </div>

        {/* Center Content Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "48px",
            width: "100%",
            flex: 1,
            marginTop: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Left Column: Crest & Club Identity */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "28px",
                overflow: "hidden",
                backgroundColor: OG_COLORS.bgElevated,
                border: `2px solid ${OG_COLORS.divider}`,
                padding: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                flexShrink: 0,
              }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={clubName}
                  width={90}
                  height={90}
                  style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
                />
              ) : (
                <span style={{ fontSize: "40px", fontWeight: 800, color: OG_COLORS.accent }}>
                  {initials}
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: clubName.length > 20 ? "44px" : "54px",
                fontWeight: 900,
                lineHeight: 1.1,
                margin: "0 0 10px 0",
                color: OG_COLORS.textPrimary,
                letterSpacing: "-0.03em",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {clubName}
            </h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "20px",
                fontWeight: 600,
                color: OG_COLORS.textMuted,
              }}
            >
              <span>{leagueName}</span>
              {squadSize > 0 && (
                <>
                  <span>•</span>
                  <span>{squadSize} Squad Members</span>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Squad Value & Honours */}
          <div
            style={{
              backgroundColor: OG_COLORS.bgCard,
              border: `2px solid ${OG_COLORS.divider}`,
              borderRadius: "28px",
              padding: "36px 44px",
              minWidth: "420px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: OG_COLORS.textMuted,
                letterSpacing: "2.5px",
                textTransform: "uppercase",
              }}
            >
              Total Squad Market Value
            </span>

            <span
              style={{
                fontSize: "68px",
                fontWeight: 900,
                color: OG_COLORS.valueText,
                lineHeight: 1.05,
                margin: "14px 0 16px 0",
                letterSpacing: "-0.03em",
              }}
            >
              {formattedVal}
            </span>

            {/* Honours Badge if verified data exists */}
            {totalHonours > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 20px",
                  borderRadius: "999px",
                  backgroundColor: OG_COLORS.bgElevated,
                  border: `1px solid ${OG_COLORS.divider}`,
                  fontSize: "15px",
                  fontWeight: 700,
                  color: OG_COLORS.textPrimary,
                }}
              >
                <span style={{ color: OG_COLORS.accent }}>🏆</span>
                <span>
                  {uclHonour ? `${uclHonour.titleCount} UCL • ` : ""}
                  {leagueHonour ? `${leagueHonour.titleCount} League Titles` : `${totalHonours} Official Titles`}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 20px",
                  borderRadius: "999px",
                  backgroundColor: OG_COLORS.bgElevated,
                  border: `1px solid ${OG_COLORS.divider}`,
                  fontSize: "15px",
                  fontWeight: 700,
                  color: OG_COLORS.textMuted,
                }}
              >
                <span>Financial Analysis & Squad Hierarchy</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: `1px solid ${OG_COLORS.divider}`,
            paddingTop: "18px",
            fontSize: "15px",
            color: OG_COLORS.textMuted,
          }}
        >
          <span>Grounded in Transfermarkt squad analytics & verified official records</span>
          <span>Squad Expenditure & Valuation Parity</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
