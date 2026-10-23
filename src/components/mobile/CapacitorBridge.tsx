"use client";

import React, { useEffect, useState } from "react";
import { Wrench, Download, AlertTriangle, X } from "lucide-react";

interface RemoteGateState {
  type: "none" | "maintenance" | "force_update" | "nudge_update";
  message?: string;
  minVersion?: string;
  latestVersion?: string;
  downloadUrl?: string;
}

function isVersionOlder(current: string, target: string): boolean {
  const c = current.split(".").map((n) => parseInt(n, 10) || 0);
  const t = target.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const cv = c[i] || 0;
    const tv = t[i] || 0;
    if (cv < tv) return true;
    if (cv > tv) return false;
  }
  return false;
}

export function CapacitorBridge() {
  const [gate, setGate] = useState<RemoteGateState>({ type: "none" });

  useEffect(() => {
    let unlistenBack: (() => void) | undefined;
    let unlistenResume: (() => void) | undefined;

    async function checkRemoteConfig(nativeVersion?: string) {
      try {
        const res = await fetch("/api/app-config");
        if (!res.ok) return;
        const config = await res.json();

        // 1. Maintenance Mode Gate
        if (config.maintenance_mode) {
          setGate({
            type: "maintenance",
            message: config.maintenance_message || "We are currently undergoing scheduled maintenance.",
          });
          return;
        }

        // 2. Version Verification (if running native or testing)
        if (nativeVersion) {
          const minSupported = config.min_supported_version || "1.0.0";
          const latest = config.latest_version || "1.0.0";
          const downloadUrl = "https://github.com/svimran47/a1score.app/releases/latest";

          if (isVersionOlder(nativeVersion, minSupported) || (config.force_update && isVersionOlder(nativeVersion, latest))) {
            setGate({
              type: "force_update",
              minVersion: minSupported,
              latestVersion: latest,
              downloadUrl,
            });
            return;
          }

          if (isVersionOlder(nativeVersion, latest)) {
            setGate({
              type: "nudge_update",
              latestVersion: latest,
              downloadUrl,
            });
            return;
          }
        }

        setGate({ type: "none" });
      } catch (e) {
        console.warn("[Capacitor] Remote config check error:", e);
      }
    }

    async function initCapacitor() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        const isNative = Capacitor.isNativePlatform();

        let nativeVersion: string | undefined;

        if (isNative) {
          // Native Status Bar
          try {
            const { StatusBar, Style } = await import("@capacitor/status-bar");
            await StatusBar.setStyle({ style: Style.Dark });
            if (Capacitor.getPlatform() === "android") {
              await StatusBar.setBackgroundColor({ color: "#0a0d12" }); // color-ignore: Native Android status bar API requires hex
            }
          } catch (e) {
            console.warn("[Capacitor] StatusBar init error:", e);
          }

          // Native Splash Screen Hide
          try {
            const { SplashScreen } = await import("@capacitor/splash-screen");
            await SplashScreen.hide();
          } catch (e) {
            console.warn("[Capacitor] SplashScreen init error:", e);
          }

          // Native Android Hardware Back Button Handling
          try {
            const { App } = await import("@capacitor/app");
            const info = await App.getInfo();
            nativeVersion = info.version;

            const backHandler = await App.addListener("backButton", ({ canGoBack }) => {
              const path = window.location.pathname;
              if (path === "/" || path === "/matches" || !canGoBack) {
                App.exitApp();
              } else {
                window.history.back();
              }
            });
            unlistenBack = () => backHandler.remove();

            const resumeHandler = await App.addListener("appStateChange", ({ isActive }) => {
              if (isActive) {
                checkRemoteConfig(nativeVersion);
              }
            });
            unlistenResume = () => resumeHandler.remove();
          } catch (e) {
            console.warn("[Capacitor] BackButton listener error:", e);
          }
        }

        // Run initial check
        checkRemoteConfig(nativeVersion);
      } catch (err) {
        console.warn("[Capacitor] Bridge setup skipped:", err);
      }
    }

    initCapacitor();

    return () => {
      if (unlistenBack) unlistenBack();
      if (unlistenResume) unlistenResume();
    };
  }, []);

  // 1. Full-screen Blocking Maintenance Screen
  if (gate.type === "maintenance") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[var(--bg-page)] text-[var(--text-primary)]">
        <div className="w-full max-w-sm p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider)] shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center mx-auto shadow-md">
            <Wrench className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Maintenance in Progress
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {gate.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-10 rounded-xl bg-[var(--bg-chip)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--text-primary)] border border-[var(--divider)] transition-colors"
          >
            Check Status
          </button>
        </div>
      </div>
    );
  }

  // 2. Full-screen Mandatory Force Update Screen
  if (gate.type === "force_update") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[var(--bg-page)] text-[var(--text-primary)]">
        <div className="w-full max-w-sm p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider)] shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center mx-auto shadow-md">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Update Required
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            This version of a1score is no longer supported. Please install version <strong>v{gate.latestVersion}</strong> to continue using the app.
          </p>
          <a
            href={gate.downloadUrl || "https://github.com/svimran47/a1score.app/releases/latest"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-opacity hover:opacity-90"
          >
            <Download className="w-4 h-4" />
            <span>Download Update</span>
          </a>
        </div>
      </div>
    );
  }

  // 3. Floating Soft Nudge Banner
  if (gate.type === "nudge_update") {
    return (
      <div className="fixed top-2 left-4 right-4 z-50 p-3 rounded-xl bg-[var(--bg-card)] border border-accent/40 shadow-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Download className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span>New update available (v{gate.latestVersion})</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={gate.downloadUrl || "https://github.com/svimran47/a1score.app/releases/latest"}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] text-[11px] font-bold"
          >
            Update
          </a>
          <button
            onClick={() => setGate({ type: "none" })}
            aria-label="Dismiss banner"
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
