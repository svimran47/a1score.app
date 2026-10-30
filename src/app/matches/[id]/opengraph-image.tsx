import React from "react";
import { ImageResponse } from "next/og";
import { getMatchDetails } from "@/lib/fotmob/client";
import { OG_COLORS } from "@/lib/og/colors";

export const runtime = "edge";
export const alt = "Match Score & Center | a1score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 60; // Refresh match card every minute

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
  const match = await getMatchDetails(resolvedParams.id).catch(() => null);

  const general = (match as any)?.general || {};
  const status = (match as any)?.status || {};
  const teams = (match as any)?.teams || {};

  const homeTeam = teams?.home || {};
  const awayTeam = teams?.away || {};

  const homeName = homeTeam?.name || "Home Team";
  const awayName = awayTeam?.name || "Away Team";
  const homeLogo = homeTeam?.imageUrl;
  const awayLogo = awayTeam?.imageUrl;

  const competitionName = general?.leagueName || "Football Match";
  const roundInfo = general?.matchRound ? `Round ${general.matchRound}` : "";

  const isStarted = Boolean(status?.started || status?.isLive || status?.finished);
  const isFinished = Boolean(status?.finished);
  const isLive = Boolean(status?.isLive);
  const isHT = Boolean(status?.isHT);

  let statusText = "UPCOMING";
  let statusBg: string = OG_COLORS.bgElevated;
  let statusColor: string = OG_COLORS.textMuted;

  if (isFinished) {
    statusText = "FULL TIME";
    statusColor = OG_COLORS.textMuted;
  } else if (isHT) {
    statusText = "HALF TIME";
    statusColor = OG_COLORS.accent;
  } else if (isLive) {
    statusText = status?.liveTime ? `LIVE ${status.liveTime}'` : "LIVE";
    statusBg = OG_COLORS.bgElevated;
    statusColor = OG_COLORS.trendUp;
  }

  // Format kickoff string if upcoming
  let kickoffText = "";
  if (!isStarted && (general?.matchTimeUTCDate || general?.matchTimeUTC)) {
    try {
      const d = new Date(general.matchTimeUTCDate || general.matchTimeUTC);
      if (!isNaN(d.getTime())) {
        kickoffText = d.toUTCString().slice(0, 22) + " UTC";
      }
    } catch {
      // ignore
    }
  }

  const homeInitials = getInitials(homeName);
  const awayInitials = getInitials(awayName);

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
            {competitionName} {roundInfo ? `• ${roundInfo}` : ""}
          </div>
        </div>

        {/* Center Match Scoreboard Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            backgroundColor: OG_COLORS.bgCard,
            border: `2px solid ${OG_COLORS.divider}`,
            borderRadius: "28px",
            padding: "40px 48px",
            marginTop: "16px",
            marginBottom: "16px",
            flex: 1,
          }}
        >
          {/* Home Team */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "300px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "24px",
                backgroundColor: OG_COLORS.bgElevated,
                border: `2px solid ${OG_COLORS.divider}`,
                padding: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              {homeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={homeLogo}
                  alt={homeName}
                  width={86}
                  height={86}
                  style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
                />
              ) : (
                <span style={{ fontSize: "38px", fontWeight: 800, color: OG_COLORS.accent }}>
                  {homeInitials}
                </span>
              )}
            </div>

            <span
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: OG_COLORS.textPrimary,
                lineHeight: 1.2,
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
                maxWidth: "280px",
              }}
            >
              {homeName}
            </span>
          </div>

          {/* Center Score / Status */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              flex: 1,
            }}
          >
            {isStarted ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "24px",
                  fontSize: "80px",
                  fontWeight: 900,
                  color: OG_COLORS.white,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  margin: "8px 0 16px 0",
                }}
              >
                <span>{homeTeam?.score ?? 0}</span>
                <span style={{ color: OG_COLORS.divider, fontSize: "56px" }}>-</span>
                <span>{awayTeam?.score ?? 0}</span>
              </div>
            ) : (
              <div
                style={{
                  fontSize: "64px",
                  fontWeight: 900,
                  color: OG_COLORS.accent,
                  letterSpacing: "4px",
                  margin: "8px 0 16px 0",
                }}
              >
                VS
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 22px",
                borderRadius: "999px",
                backgroundColor: statusBg,
                border: `1px solid ${OG_COLORS.divider}`,
                fontSize: "15px",
                fontWeight: 800,
                color: statusColor,
                letterSpacing: "1.5px",
              }}
            >
              {statusText}
            </div>

            {kickoffText && !isStarted && (
              <span
                style={{
                  fontSize: "14px",
                  color: OG_COLORS.textMuted,
                  marginTop: "12px",
                  fontWeight: 600,
                }}
              >
                {kickoffText}
              </span>
            )}
          </div>

          {/* Away Team */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "300px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "24px",
                backgroundColor: OG_COLORS.bgElevated,
                border: `2px solid ${OG_COLORS.divider}`,
                padding: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              {awayLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={awayLogo}
                  alt={awayName}
                  width={86}
                  height={86}
                  style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
                />
              ) : (
                <span style={{ fontSize: "38px", fontWeight: 800, color: OG_COLORS.accent }}>
                  {awayInitials}
                </span>
              )}
            </div>

            <span
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: OG_COLORS.textPrimary,
                lineHeight: 1.2,
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
                maxWidth: "280px",
              }}
            >
              {awayName}
            </span>
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
          <span>Money Meets the Pitch — Match events, lineups & squad valuations</span>
          <span>FotMob match statistics & Transfermarkt valuation data</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
