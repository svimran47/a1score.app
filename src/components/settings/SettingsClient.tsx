"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Coins,
  Ruler,
  type LucideIcon,
  FileText,
  HelpCircle,
  Info,
  Mail,
  Share2,
  ShieldCheck,
  SunMoon,
} from "lucide-react";
import { MenuGroup, MenuRow } from "@/components/more/MenuRow";
import { AccountSettings } from "@/components/auth/AccountSettings";
import {
  THEME_CHANGE_EVENT,
  THEME_OPTIONS,
  readThemePreference,
  setThemePreference,
  themeLabel,
  type ThemePreference,
} from "@/lib/theme";
import { CURRENCIES, currencyMeta } from "@/lib/currency";
import { ensureRates, setCurrency } from "@/lib/currency-store";
import { useCurrencySetting } from "@/lib/useMoney";
import { MEASUREMENT_OPTIONS } from "@/lib/units";
import { setMeasurementSystem, useMeasurementSystem } from "@/lib/useUnits";
import { formatDateGB } from "@/lib/format-value";

export const SUPPORT_EMAIL = "admin@a1score.app";

/** A settings row that expands into a single-choice list. */
function ChoiceSetting<T extends string>({
  icon,
  label,
  value,
  options,
  onChange,
  note,
}: {
  icon: LucideIcon;
  label: string;
  /** null until the stored value has been read on the client. */
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  note?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label;

  return (
    <div>
      <MenuRow
        icon={icon}
        label={label}
        description={current ?? "\u00a0"}
        onClick={() => setOpen((o) => !o)}
        ariaExpanded={open}
        trailing={
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        }
      />
      {open && (
        <div className="px-4 pb-3 pl-[58px] space-y-1">
          <div role="radiogroup" aria-label={label} className="space-y-1">
            {options.map((opt) => {
              const selected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(opt.value)}
                  className={`w-full flex items-center justify-between min-h-[44px] px-3 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                    selected
                      ? "bg-[var(--bg-chip)] text-[var(--text-primary)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <span>{opt.label}</span>
                  {selected && <Check aria-hidden="true" className="w-4 h-4 text-[var(--accent)]" />}
                </button>
              );
            })}
          </div>
          {note && <p className="px-3 pt-1 text-xs leading-relaxed text-[var(--text-muted)]">{note}</p>}
        </div>
      )}
    </div>
  );
}

function ThemeSetting() {
  const [pref, setPref] = useState<ThemePreference | null>(null);

  useEffect(() => {
    const sync = () => setPref(readThemePreference());
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  return (
    <ChoiceSetting
      icon={SunMoon}
      label="Theme"
      value={pref}
      options={THEME_OPTIONS}
      onChange={(v) => {
        setThemePreference(v);
        setPref(v);
      }}
    />
  );
}

function CurrencySetting() {
  const mounted = useMounted();
  const { code, fx, status } = useCurrencySetting();

  // Loading rates here means the note can show their date even before a switch.
  useEffect(() => {
    void ensureRates();
  }, []);

  const note =
    code === "EUR"
      ? "Market values and fees are recorded in euros."
      : fx?.rates[code]
        ? `Converted from euros at the European Central Bank reference rate of ${formatDateGB(fx.date)} (€1 = ${currencyMeta(code).symbol}${fx.rates[code]!.toFixed(4)}). Values are recorded in euros.`
        : status === "failed"
          ? "Exchange rates are unavailable right now, so values are shown in euros."
          : "Loading exchange rates…";

  return (
    <ChoiceSetting
      icon={Coins}
      label="Currency"
      value={mounted ? code : null}
      options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
      onChange={setCurrency}
      note={note}
    />
  );
}

function MeasurementSetting() {
  const mounted = useMounted();
  const system = useMeasurementSystem();
  return (
    <ChoiceSetting
      icon={Ruler}
      label="Measurement system"
      value={mounted ? system : null}
      options={MEASUREMENT_OPTIONS}
      onChange={setMeasurementSystem}
    />
  );
}

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function ShareRow() {
  const [status, setStatus] = useState<string | null>(null);

  const share = async () => {
    const url = window.location.origin;
    const data = {
      title: "a1score",
      text: "Live scores, player market values and transfers on a1score.",
      url,
    };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("Link copied");
    } catch (err) {
      // AbortError = the user closed the share sheet; nothing to report.
      if (err instanceof Error && err.name === "AbortError") return;
      setStatus("Couldn't share — copy the link from the address bar");
    }
  };

  return (
    <MenuRow
      icon={Share2}
      label="Share a1score"
      description={status ? <span role="status">{status}</span> : undefined}
      onClick={share}
    />
  );
}

export function SettingsClient({ appVersion }: { appVersion: string }) {
  return (
    <div className="space-y-6">
      <AccountSettings />
      <MenuGroup>
        <ThemeSetting />
        <CurrencySetting />
        <MeasurementSetting />
        <MenuRow
          icon={Bell}
          label="Notifications"
          description="Match, transfer and value alerts"
          href="/settings/notifications"
        />
      </MenuGroup>

      <MenuGroup title="Others">
        <ShareRow />
        <MenuRow
          icon={HelpCircle}
          label="Tips and support"
          description={SUPPORT_EMAIL}
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("a1score support")}`}
        />
        <MenuRow icon={ShieldCheck} label="Privacy policy" href="/privacy" />
        <MenuRow icon={FileText} label="Terms of use" href="/terms" />
        <MenuRow
          icon={Mail}
          label="Advertise with us"
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Advertising on a1score")}`}
        />
        <MenuRow icon={Info} label="App version" description={appVersion} />
      </MenuGroup>
    </div>
  );
}
