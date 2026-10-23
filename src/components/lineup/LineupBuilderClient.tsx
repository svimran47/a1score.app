"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Share2, Users, X, RefreshCw, Plus, Sparkles, Check, Loader2 } from "lucide-react";
import { FORMATIONS, FormationKey, LineupSlot, calculateLineupMetrics } from "@/lib/lineup/types";
import { useMoney } from "@/lib/useMoney";

interface CandidatePlayer {
  id: string;
  name: string;
  club: string;
  position: string;
  role: "GK" | "DEF" | "MID" | "ATT";
  marketValueEur: number;
  age: number;
}

function inferRole(pos?: string): "GK" | "DEF" | "MID" | "ATT" {
  if (!pos) return "MID";
  const p = pos.toLowerCase();
  if (p.includes("goal") || p === "gk") return "GK";
  if (
    p.includes("back") ||
    p.includes("defen") ||
    p === "cb" ||
    p === "lb" ||
    p === "rb" ||
    p === "rwb" ||
    p === "lwb"
  ) {
    return "DEF";
  }
  if (
    p.includes("mid") ||
    p === "cm" ||
    p === "cdm" ||
    p === "cam" ||
    p === "dm" ||
    p === "am"
  ) {
    return "MID";
  }
  return "ATT";
}

const CANDIDATE_PLAYERS: CandidatePlayer[] = [
  // Attackers
  { id: "haaland", name: "Erling Haaland", club: "Manchester City", position: "ST", role: "ATT", marketValueEur: 200_000_000, age: 24 },
  { id: "vinicius", name: "Vinícius Júnior", club: "Real Madrid", position: "LW", role: "ATT", marketValueEur: 200_000_000, age: 24 },
  { id: "mbappe", name: "Kylian Mbappé", club: "Real Madrid", position: "ST", role: "ATT", marketValueEur: 180_000_000, age: 25 },
  { id: "yamal", name: "Lamine Yamal", club: "Barcelona", position: "RW", role: "ATT", marketValueEur: 150_000_000, age: 17 },
  { id: "saka", name: "Bukayo Saka", club: "Arsenal", position: "RW", role: "ATT", marketValueEur: 140_000_000, age: 23 },
  { id: "palmer", name: "Cole Palmer", club: "Chelsea", position: "RW", role: "ATT", marketValueEur: 90_000_000, age: 22 },

  // Midfielders
  { id: "bellingham", name: "Jude Bellingham", club: "Real Madrid", position: "CAM", role: "MID", marketValueEur: 180_000_000, age: 21 },
  { id: "rodri", name: "Rodri", club: "Manchester City", position: "CDM", role: "MID", marketValueEur: 130_000_000, age: 28 },
  { id: "musiala", name: "Jamal Musiala", club: "Bayern Munich", position: "CAM", role: "MID", marketValueEur: 130_000_000, age: 21 },
  { id: "wirtz", name: "Florian Wirtz", club: "Bayer Leverkusen", position: "CAM", role: "MID", marketValueEur: 130_000_000, age: 21 },
  { id: "valverde", name: "Federico Valverde", club: "Real Madrid", position: "CM", role: "MID", marketValueEur: 130_000_000, age: 26 },
  { id: "rice", name: "Declan Rice", club: "Arsenal", position: "CDM", role: "MID", marketValueEur: 120_000_000, age: 25 },
  { id: "odegaard", name: "Martin Ødegaard", club: "Arsenal", position: "CAM", role: "MID", marketValueEur: 110_000_000, age: 25 },

  // Defenders
  { id: "saliba", name: "William Saliba", club: "Arsenal", position: "CB", role: "DEF", marketValueEur: 80_000_000, age: 23 },
  { id: "dias", name: "Rúben Dias", club: "Manchester City", position: "CB", role: "DEF", marketValueEur: 80_000_000, age: 27 },
  { id: "gvardiol", name: "Joško Gvardiol", club: "Manchester City", position: "LB", role: "DEF", marketValueEur: 75_000_000, age: 22 },
  { id: "gabriel", name: "Gabriel Magalhães", club: "Arsenal", position: "CB", role: "DEF", marketValueEur: 75_000_000, age: 26 },
  { id: "trent", name: "Trent Alexander-Arnold", club: "Liverpool", position: "RB", role: "DEF", marketValueEur: 70_000_000, age: 26 },
  { id: "davies", name: "Alphonso Davies", club: "Bayern Munich", position: "LB", role: "DEF", marketValueEur: 50_000_000, age: 23 },
  { id: "vandijk", name: "Virgil van Dijk", club: "Liverpool", position: "CB", role: "DEF", marketValueEur: 30_000_000, age: 33 },

  // Goalkeepers
  { id: "raya", name: "David Raya", club: "Arsenal", position: "GK", role: "GK", marketValueEur: 40_000_000, age: 29 },
  { id: "ederson", name: "Ederson", club: "Manchester City", position: "GK", role: "GK", marketValueEur: 35_000_000, age: 31 },
  { id: "alisson", name: "Alisson Becker", club: "Liverpool", position: "GK", role: "GK", marketValueEur: 28_000_000, age: 32 },
  { id: "courtois", name: "Thibaut Courtois", club: "Real Madrid", position: "GK", role: "GK", marketValueEur: 25_000_000, age: 32 },
];

export function LineupBuilderClient() {
  const searchParams = useSearchParams();
  const clubParam = searchParams.get("club");

  const [formationKey, setFormationKey] = useState<FormationKey>("4-3-3");
  const [slots, setSlots] = useState<LineupSlot[]>(FORMATIONS["4-3-3"].slots);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(clubParam || "");
  const [searchResults, setSearchResults] = useState<CandidatePlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  const { compact } = useMoney();
  const metrics = calculateLineupMetrics(slots);

  // Sync club param if present
  useEffect(() => {
    if (clubParam) {
      setSearchQuery(clubParam);
    }
  }, [clubParam]);

  // Live player search via API
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}&limit=15`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const mapped: CandidatePlayer[] = json.data.map((p: any) => ({
              id: String(p.id || p.transfermarktId),
              name: p.commonName || p.fullName,
              club: p.currentClub?.name || p.clubName || "Unknown Club",
              position: p.position || "FW",
              role: inferRole(p.position),
              marketValueEur: Number(p.latestMarketValue || p.marketValueEur || 0),
              age: Number(p.age || 25),
            }));
            setSearchResults(mapped);
          }
        }
      } catch (err) {
        console.warn("[LineupBuilder] Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFormationChange = (newKey: FormationKey) => {
    setFormationKey(newKey);
    // Keep previously assigned players if matching by slot index
    const templateSlots = FORMATIONS[newKey].slots;
    setSlots(
      templateSlots.map((newSlot, idx) => {
        const old = slots[idx];
        return {
          ...newSlot,
          playerId: old?.playerId,
          playerName: old?.playerName,
          clubName: old?.clubName,
          marketValueEur: old?.marketValueEur,
          age: old?.age,
        };
      })
    );
  };

  const handleSelectPlayer = (player: CandidatePlayer) => {
    if (!activeSlotId) return;
    setSlots((prev) =>
      prev.map((s) =>
        s.id === activeSlotId
          ? {
              ...s,
              playerId: player.id,
              playerName: player.name,
              clubName: player.club,
              marketValueEur: player.marketValueEur,
              age: player.age,
            }
          : s
      )
    );
    setActiveSlotId(null);
  };

  const handleRemovePlayer = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              playerId: undefined,
              playerName: undefined,
              clubName: undefined,
              marketValueEur: undefined,
              age: undefined,
            }
          : s
      )
    );
  };

  const handleClearAll = () => {
    setSlots(FORMATIONS[formationKey].slots);
  };

  const handleShare = () => {
    const filledNames = slots.filter((s) => s.playerName).map((s) => `${s.position}: ${s.playerName}`);
    const text = `⚽ My a1score Dream XI (${formationKey})\n💰 Squad Value: ${compact(metrics.totalValueEur)}\n\n${filledNames.join("\n")}\n\nBuild yours at https://a1score.app/lineup-builder`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const candidatePool = searchResults.length > 0 ? searchResults : CANDIDATE_PLAYERS;
  const filteredCandidates = candidatePool.filter((p) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.club.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q)
    );
  });

  const activeSlot = slots.find((s) => s.id === activeSlotId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-bg-card to-bg-card border border-emerald-500/20">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Tactical XI • Squad Valuation
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Lineup & Squad Builder</h1>
          <p className="text-sm text-text-secondary mt-1">
            Build your ultimate dream XI and track live combined squad market valuation.
          </p>
        </div>

        {/* Squad Valuation Card */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-bg-chip border border-border-subtle text-center min-w-[120px]">
            <div className="text-xl font-bold text-emerald-400">{compact(metrics.totalValueEur)}</div>
            <div className="text-[11px] font-medium text-text-muted">Total Squad Value</div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-bg-chip border border-border-subtle text-center min-w-[85px]">
            <div className="text-xl font-bold text-text-primary">{metrics.averageAge ? `${metrics.averageAge}y` : "—"}</div>
            <div className="text-[11px] font-medium text-text-muted">Avg Age</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Formations & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-bg-card border border-border-subtle">
        {/* Formation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(Object.keys(FORMATIONS) as FormationKey[]).map((fKey) => (
            <button
              key={fKey}
              onClick={() => handleFormationChange(fKey)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                formationKey === fKey
                  ? "bg-emerald-500 text-black shadow-sm"
                  : "bg-bg-chip text-text-secondary hover:text-text-primary border border-border-subtle"
              }`}
            >
              {fKey}
            </button>
          ))}
        </div>

        {/* Share & Reset Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearAll}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-chip rounded-lg transition-colors text-xs flex items-center gap-1.5"
            title="Reset lineup"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={handleShare}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-bg-chip border border-border-subtle text-text-primary hover:bg-bg-hover flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Share Lineup"}
          </button>
        </div>
      </div>

      {/* Interactive Football Pitch */}
      {/* color-ignore */} <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] md:aspect-[16/11] bg-gradient-to-b from-[#0b3318] via-[#0f4420] to-[#0b3318] rounded-2xl border-2 border-emerald-600/30 shadow-2xl overflow-hidden">
        {/* Pitch Turf Lines & Markings */}
        <div className="absolute inset-3 border border-emerald-500/25 rounded-lg pointer-events-none" />
        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 border-t border-emerald-500/25 pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 sm:w-36 sm:h-36 border border-emerald-500/25 rounded-full pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500/30 rounded-full pointer-events-none" />

        {/* Penalty Areas */}
        <div className="absolute left-1/2 top-3 -translate-x-1/2 w-48 sm:w-64 h-20 sm:h-24 border-b border-x border-emerald-500/25 pointer-events-none" />
        <div className="absolute left-1/2 bottom-3 -translate-x-1/2 w-48 sm:w-64 h-20 sm:h-24 border-t border-x border-emerald-500/25 pointer-events-none" />

        {/* 11 Tactical Player Slots */}
        {slots.map((slot) => {
          const isSelected = activeSlotId === slot.id;
          const isFilled = Boolean(slot.playerName);

          return (
            <div
              key={slot.id}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer select-none z-10"
              onClick={() => setActiveSlotId(slot.id)}
            >
              {/* Jersey / Slot Node */}
              <div
                className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  isFilled
                    ? "bg-slate-900 border-2 border-emerald-400 text-white shadow-lg"
                    : "bg-black/60 border border-white/20 text-white/70 hover:border-emerald-400 hover:text-white"
                } ${isSelected ? "ring-4 ring-emerald-400/50 scale-110" : "group-hover:scale-105"}`}
              >
                {isFilled ? (
                  <span className="text-xs sm:text-sm font-black">{slot.position}</span>
                ) : (
                  <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                )}

                {/* Remove button if filled */}
                {isFilled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlayer(slot.id);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-rose-600 shadow"
                    title="Remove player"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Player Name & Value Card */}
              <div className="mt-1 flex flex-col items-center max-w-[90px] sm:max-w-[110px] text-center">
                <span className="text-[11px] sm:text-xs font-bold text-white drop-shadow truncate w-full">
                  {slot.playerName || slot.position}
                </span>
                {slot.marketValueEur ? (
                  <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-300 drop-shadow">
                    {compact(slot.marketValueEur)}
                  </span>
                ) : (
                  <span className="text-[9px] text-white/50 drop-shadow">Tap to pick</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Player Picker Modal / Drawer */}
      {activeSlotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Select {activeSlot?.position} Player
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Slot role: {activeSlot?.role} ({activeSlot?.position})
                </p>
              </div>
              <button
                onClick={() => setActiveSlotId(null)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="py-3 relative">
              <input
                type="text"
                placeholder="Search player, club, position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-bg-chip border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500 pr-9"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Player List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredCandidates.length === 0 && !isSearching ? (
                <div className="py-8 text-center text-xs text-text-muted">
                  No players found matching &ldquo;{searchQuery}&rdquo;. Try another name.
                </div>
              ) : (
                filteredCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    onClick={() => handleSelectPlayer(candidate)}
                    className="p-3 rounded-xl bg-bg-chip border border-border-subtle hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-sm font-bold text-text-primary">{candidate.name}</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {candidate.club} • {candidate.position} • {candidate.age} yrs
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">
                        {compact(candidate.marketValueEur)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer / Remove Action */}
            {activeSlot?.playerName && (
              <div className="pt-3 border-t border-border-subtle mt-3 flex justify-between">
                <button
                  onClick={() => {
                    handleRemovePlayer(activeSlotId);
                    setActiveSlotId(null);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                >
                  Clear Position
                </button>
                <button
                  onClick={() => setActiveSlotId(null)}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
