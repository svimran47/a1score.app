"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Server,
  Database,
  Radio,
  Zap,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Sliders,
  AlertTriangle,
  Play,
  CheckCircle2,
  Lock,
  Unlock,
  Users,
  Trophy,
  Smartphone,
  Bell,
  ArrowRight,
} from "lucide-react";

interface AdminData {
  authenticated: boolean;
  health: {
    edge: string;
    database: string;
    cloudflare: string;
    githubActions: string;
  };
  counts: {
    players: number;
    clubs: number;
    leagues: number;
    transfers: number;
  };
  flags: {
    predict: boolean;
    tv: boolean;
    news: boolean;
    compare: boolean;
    ads: boolean;
  };
  maintenance: {
    enabled: boolean;
    message: string;
  };
  mobile: {
    minSupported: string;
    latest: string;
    forceUpdate: boolean;
    downloadUrl: string;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    entity_id: string;
    created_at: string;
  }>;
}

export function AdminDashboardClient() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Content search
  const [searchEntity, setSearchEntity] = useState<"player" | "club" | "league">("player");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Maintenance state
  const [maintMessage, setMaintMessage] = useState("");

  // Mobile version state
  const [mobileMin, setMobileMin] = useState("0.1.0");
  const [mobileLatest, setMobileLatest] = useState("0.1.0");
  const [mobileForce, setMobileForce] = useState(false);

  // Push notification state
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const storedKey = typeof window !== "undefined" ? localStorage.getItem("a1_admin_key") || "" : "";
      const headers: Record<string, string> = {};
      if (storedKey) headers["x-admin-key"] = storedKey;

      const res = await fetch("/api/admin", { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.maintenance?.message) setMaintMessage(json.maintenance.message);
        if (json.mobile) {
          setMobileMin(json.mobile.minSupported || "0.1.0");
          setMobileLatest(json.mobile.latest || "0.1.0");
          setMobileForce(Boolean(json.mobile.forceUpdate));
        }
        if (json.authenticated || storedKey) {
          setIsUnlocked(true);
          setAdminKey(storedKey);
        }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    localStorage.setItem("a1_admin_key", keyInput.trim());
    setAdminKey(keyInput.trim());
    setIsUnlocked(true);
    fetchData();
  };

  const handleLock = () => {
    localStorage.removeItem("a1_admin_key");
    setAdminKey("");
    setIsUnlocked(false);
  };

  const postAction = async (action: string, payload: any = {}) => {
    setActionLoading(action);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey || localStorage.getItem("a1_admin_key") || "",
        },
        body: JSON.stringify({ action, payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");

      setFeedback(json.message || "Updated successfully");
      setTimeout(() => setFeedback(null), 3500);
      fetchData();
    } catch (err: any) {
      alert(err?.message || "Error performing action");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFlag = (flagName: string, currentValue: boolean) => {
    postAction("toggle_flag", { flag: flagName, value: !currentValue });
  };

  const toggleMaintenance = () => {
    if (!data) return;
    postAction("set_maintenance", {
      enabled: !data.maintenance.enabled,
      message: maintMessage,
    });
  };

  const saveMobileVersion = () => {
    postAction("update_mobile", {
      minSupported: mobileMin,
      latest: mobileLatest,
      forceUpdate: mobileForce,
      downloadUrl: data?.mobile.downloadUrl || "/download/app-release.apk",
    });
  };

  const sendPushBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;
    postAction("send_broadcast", {
      title: pushTitle.trim(),
      body: pushBody.trim(),
      url: pushUrl.trim() || "/",
    });
    setPushTitle("");
    setPushBody("");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey || localStorage.getItem("a1_admin_key") || "",
        },
        body: JSON.stringify({
          action: "search_content",
          payload: { query: searchQuery, entityType: searchEntity },
        }),
      });
      const json = await res.json();
      setSearchResults(json.results || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const toggleEntityStatus = async (id: string, isDeleted: boolean) => {
    await postAction("toggle_entity", { id, entityType: searchEntity, isDeleted });
    setSearchResults((prev) =>
      prev.map((item) => (item.id === id ? { ...item, deletedAt: isDeleted ? null : new Date().toISOString() } : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Status */}
      <div
        className="p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--divider)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--bg-chip)",
              color: "var(--accent)",
            }}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Control Plane</h2>
              <span
                className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background: isUnlocked ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  color: isUnlocked ? "var(--live)" : "var(--trend-down)",
                }}
              >
                {isUnlocked ? "Live Access" : "Read-Only"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Live edge control, feature switches, and monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <button
              onClick={handleLock}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors"
              style={{
                background: "var(--bg-chip)",
                borderColor: "var(--divider)",
                color: "var(--text-secondary)",
              }}
            >
              <Lock className="w-3.5 h-3.5" />
              Lock
            </button>
          ) : (
            <form onSubmit={handleUnlock} className="flex items-center gap-1.5">
              <input
                type="password"
                placeholder="Admin Secret..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs border focus:outline-none w-32"
                style={{
                  background: "var(--bg-chip)",
                  borderColor: "var(--divider)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                }}
              >
                Unlock
              </button>
            </form>
          )}

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 rounded-lg border transition-colors disabled:opacity-50"
            style={{
              background: "var(--bg-chip)",
              borderColor: "var(--divider)",
              color: "var(--text-primary)",
            }}
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className="p-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in"
          style={{
            background: "rgba(34, 197, 94, 0.12)",
            borderColor: "rgba(34, 197, 94, 0.25)",
            color: "var(--live)",
          }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid: Health Status & System Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Edge Runtime</span>
            <Server className="w-4 h-4" style={{ color: "var(--live)" }} />
          </div>
          <div className="mt-2 text-lg font-bold text-[var(--text-primary)]">Cloudflare</div>
          <div className="text-[11px] font-semibold text-[var(--live)] mt-0.5">● Active / Low Latency</div>
        </div>

        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Database</span>
            <Database className="w-4 h-4" style={{ color: "var(--live)" }} />
          </div>
          <div className="mt-2 text-lg font-bold text-[var(--text-primary)]">Supabase</div>
          <div className="text-[11px] font-semibold text-[var(--live)] mt-0.5">● Connected</div>
        </div>

        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Total Players</span>
            <Users className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <div className="mt-2 text-lg font-bold text-[var(--text-primary)]">
            {data?.counts.players ? data.counts.players.toLocaleString() : "—"}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Verified profiles</div>
        </div>

        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Active Clubs</span>
            <Trophy className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <div className="mt-2 text-lg font-bold text-[var(--text-primary)]">
            {data?.counts.clubs ? data.counts.clubs.toLocaleString() : "—"}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Global teams</div>
        </div>
      </div>

      {/* Feature Flags & Maintenance Control */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--divider)" }}>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Feature Flags & Live Switches</h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">Immediate Edge Effect</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: "predict", label: "Match Predictor", desc: "AI win-probability & polls" },
            { key: "tv", label: "TV Guide", desc: "Live match broadcasting channels" },
            { key: "news", label: "News Feed", desc: "Aggregated football news stories" },
            { key: "compare", label: "Player Comparison", desc: "H2H radar and stat comparison" },
            { key: "ads", label: "Monetization Ads", desc: "Reserved zero-CLS ad banners" },
          ].map((item) => {
            const isEnabled = data?.flags ? Boolean((data.flags as any)[item.key]) : true;
            return (
              <div
                key={item.key}
                className="p-3.5 rounded-xl border flex items-center justify-between"
                style={{
                  background: "var(--bg-chip)",
                  borderColor: "var(--divider)",
                }}
              >
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">{item.label}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{item.desc}</div>
                </div>
                <button
                  onClick={() => toggleFlag(item.key, isEnabled)}
                  disabled={!isUnlocked || actionLoading === "toggle_flag"}
                  className="w-11 h-6 rounded-full transition-colors relative focus:outline-none disabled:opacity-40"
                  style={{
                    background: isEnabled ? "var(--live)" : "var(--divider)",
                  }}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      isEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Maintenance Mode */}
        <div
          className="p-4 rounded-xl border mt-3 space-y-3"
          style={{
            background: data?.maintenance.enabled ? "rgba(239, 68, 68, 0.08)" : "var(--bg-chip)",
            borderColor: data?.maintenance.enabled ? "rgba(239, 68, 68, 0.3)" : "var(--divider)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: data?.maintenance.enabled ? "var(--trend-down)" : "var(--text-muted)" }}
              />
              <span className="text-xs font-bold text-[var(--text-primary)]">Maintenance Killswitch</span>
            </div>
            <button
              onClick={toggleMaintenance}
              disabled={!isUnlocked || actionLoading === "set_maintenance"}
              className="px-3 py-1 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40"
              style={{
                background: data?.maintenance.enabled ? "var(--trend-down)" : "var(--bg-card)",
                color: data?.maintenance.enabled ? "var(--white)" : "var(--text-primary)",
                borderColor: "var(--divider)",
              }}
            >
              {data?.maintenance.enabled ? "Deactivate Maintenance" : "Enable Maintenance"}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Custom maintenance broadcast message..."
              value={maintMessage}
              onChange={(e) => setMaintMessage(e.target.value)}
              disabled={!isUnlocked}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs border focus:outline-none"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--divider)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={() =>
                postAction("set_maintenance", {
                  enabled: Boolean(data?.maintenance.enabled),
                  message: maintMessage,
                })
              }
              disabled={!isUnlocked}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--divider)",
                color: "var(--text-primary)",
              }}
            >
              Save Message
            </button>
          </div>
        </div>
      </div>

      {/* Quick Operations */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
      >
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--divider)" }}>
          <Zap className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h3 className="font-bold text-sm text-[var(--text-primary)]">Quick Operations & Pipelines</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => postAction("trigger_sync")}
            disabled={!isUnlocked || actionLoading === "trigger_sync"}
            className="p-3.5 rounded-xl border flex items-center justify-between text-left transition-colors hover:bg-[var(--bg-chip)] disabled:opacity-40"
            style={{ background: "var(--bg-chip)", borderColor: "var(--divider)" }}
          >
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Sync Squads & Transfers</div>
              <div className="text-[11px] text-[var(--text-muted)]">Runs data reconciliation</div>
            </div>
            <Play className="w-4 h-4 text-[var(--accent)]" />
          </button>

          <button
            onClick={() => postAction("snapshot_values")}
            disabled={!isUnlocked || actionLoading === "snapshot_values"}
            className="p-3.5 rounded-xl border flex items-center justify-between text-left transition-colors hover:bg-[var(--bg-chip)] disabled:opacity-40"
            style={{ background: "var(--bg-chip)", borderColor: "var(--divider)" }}
          >
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Market Value Snapshot</div>
              <div className="text-[11px] text-[var(--text-muted)]">Recalculates historic points</div>
            </div>
            <Radio className="w-4 h-4 text-[var(--accent)]" />
          </button>

          <button
            onClick={() => postAction("purge_cache")}
            disabled={!isUnlocked || actionLoading === "purge_cache"}
            className="p-3.5 rounded-xl border flex items-center justify-between text-left transition-colors hover:bg-[var(--bg-chip)] disabled:opacity-40"
            style={{ background: "var(--bg-chip)", borderColor: "var(--divider)" }}
          >
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Purge Edge Cache</div>
              <div className="text-[11px] text-[var(--text-muted)]">Flushes Cloudflare tags</div>
            </div>
            <RefreshCw className="w-4 h-4 text-[var(--accent)]" />
          </button>
        </div>
      </div>

      {/* Mobile Version & Push Notification Broadcasts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mobile Version Control */}
        <div
          className="p-5 rounded-2xl border space-y-4 flex flex-col justify-between"
          style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--divider)" }}>
              <Smartphone className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Mobile APK Versioning</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Min Supported</label>
                <input
                  type="text"
                  value={mobileMin}
                  onChange={(e) => setMobileMin(e.target.value)}
                  disabled={!isUnlocked}
                  className="w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs focus:outline-none"
                  style={{
                    background: "var(--bg-chip)",
                    borderColor: "var(--divider)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Latest Version</label>
                <input
                  type="text"
                  value={mobileLatest}
                  onChange={(e) => setMobileLatest(e.target.value)}
                  disabled={!isUnlocked}
                  className="w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs focus:outline-none"
                  style={{
                    background: "var(--bg-chip)",
                    borderColor: "var(--divider)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[var(--text-secondary)]">Mandatory Force-Update Gate</span>
              <button
                type="button"
                onClick={() => setMobileForce((f) => !f)}
                disabled={!isUnlocked}
                className="w-10 h-5 rounded-full transition-colors relative disabled:opacity-40"
                style={{ background: mobileForce ? "var(--trend-down)" : "var(--divider)" }}
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    mobileForce ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            onClick={saveMobileVersion}
            disabled={!isUnlocked || actionLoading === "update_mobile"}
            className="w-full py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40"
            style={{
              background: "var(--bg-chip)",
              borderColor: "var(--divider)",
              color: "var(--text-primary)",
            }}
          >
            Update Mobile Config
          </button>
        </div>

        {/* Web Push Broadcast Composer */}
        <form
          onSubmit={sendPushBroadcast}
          className="p-5 rounded-2xl border space-y-3 flex flex-col justify-between"
          style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--divider)" }}>
              <Bell className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Push Notification Broadcast</h3>
            </div>

            <input
              type="text"
              placeholder="Title (e.g. Breaking Transfer Deal)"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              disabled={!isUnlocked}
              className="w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none"
              style={{
                background: "var(--bg-chip)",
                borderColor: "var(--divider)",
                color: "var(--text-primary)",
              }}
            />

            <textarea
              placeholder="Body text..."
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              disabled={!isUnlocked}
              rows={2}
              className="w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none resize-none"
              style={{
                background: "var(--bg-chip)",
                borderColor: "var(--divider)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!isUnlocked || actionLoading === "send_broadcast" || !pushTitle.trim()}
            className="w-full py-2 rounded-xl text-xs font-bold transition-opacity disabled:opacity-40"
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
            }}
          >
            Send Push Broadcast
          </button>
        </form>
      </div>

      {/* Content Quick Search & Management */}
      <div
        className="p-5 rounded-2xl border space-y-4"
        style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--divider)" }}>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Content Search & Quick Toggle</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {(["player", "club", "league"] as const).map((ent) => (
              <button
                key={ent}
                type="button"
                onClick={() => {
                  setSearchEntity(ent);
                  setSearchResults([]);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors"
                style={{
                  background: searchEntity === ent ? "var(--accent)" : "var(--bg-chip)",
                  color: searchEntity === ent ? "var(--accent-contrast)" : "var(--text-secondary)",
                }}
              >
                {ent}s
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder={`Search ${searchEntity} name (e.g. Haaland, Arsenal, Premier League)...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-xs border focus:outline-none"
            style={{
              background: "var(--bg-chip)",
              borderColor: "var(--divider)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 rounded-lg text-xs font-bold border transition-colors"
            style={{
              background: "var(--bg-chip)",
              borderColor: "var(--divider)",
              color: "var(--text-primary)",
            }}
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2 pt-1">
            {searchResults.map((item) => {
              const isDeleted = Boolean(item.deletedAt);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border flex items-center justify-between text-xs"
                  style={{
                    background: "var(--bg-chip)",
                    borderColor: "var(--divider)",
                  }}
                >
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">{item.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {item.position || item.country || "Active"} •{" "}
                      {item.marketValue
                        ? `€${item.marketValue.toLocaleString()}`
                        : item.season || item.shortName || item.id}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{
                        background: isDeleted ? "rgba(239, 68, 68, 0.12)" : "rgba(34, 197, 94, 0.12)",
                        color: isDeleted ? "var(--trend-down)" : "var(--live)",
                      }}
                    >
                      {isDeleted ? "Hidden" : "Active"}
                    </span>
                    <button
                      onClick={() => toggleEntityStatus(item.id, isDeleted)}
                      disabled={!isUnlocked}
                      className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--bg-card)] disabled:opacity-40"
                      style={{
                        borderColor: "var(--divider)",
                        color: "var(--text-secondary)",
                      }}
                      title={isDeleted ? `Restore ${searchEntity}` : `Hide ${searchEntity}`}
                    >
                      {isDeleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <div
          className="p-5 rounded-2xl border space-y-3"
          style={{ background: "var(--bg-card)", borderColor: "var(--divider)" }}
        >
          <div className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Recent Operational Activity
          </div>
          <div className="divide-y text-xs" style={{ borderColor: "var(--divider)" }}>
            {data.recentActivity.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[var(--text-primary)]">{log.action}</span>
                  <span className="text-[var(--text-muted)] ml-1">on {log.entity}</span>
                  {log.entity_id && (
                    <span className="font-mono text-[11px] text-[var(--text-secondary)] ml-1">
                      ({log.entity_id})
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-[var(--text-muted)]">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
