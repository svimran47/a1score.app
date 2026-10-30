import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function walk(dir: string, exts: string[]): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, exts);
    return exts.some((ext) => entry.name.endsWith(ext)) ? [full] : [];
  });
}

const sourceFiles = walk(path.join(ROOT, "src"), [".tsx", ".ts", ".css"]);
const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");

test("design tokens: every var(--x) used in src is defined", () => {
  const css = ["src/app/tokens.css", "src/app/globals.css"]
    .map((f) => fs.readFileSync(path.join(ROOT, f), "utf-8"))
    .join("\n");
  const defined = new Set(Array.from(css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g), (m) => m[1]));
  // Set at runtime by next/font on <html> (src/app/layout.tsx)
  defined.add("--font-figtree");
  defined.add("--font-oxanium");

  const missing: string[] = [];
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, "utf-8");
    for (const [, name] of Array.from(text.matchAll(/var\((--[a-zA-Z0-9-]+)/g))) {
      if (!defined.has(name) && !name.startsWith("--tw-")) missing.push(`${rel(file)}: ${name}`);
    }
  }
  // An undefined variable silently resolves to inherit/initial: borders turn
  // currentColor, surfaces go transparent, trend colours vanish.
  assert.deepEqual(Array.from(new Set(missing)), []);
});

test("design tokens: no opacity modifiers on arbitrary var() colours", () => {
  // Tailwind 3 cannot apply `/95` to `bg-[var(--x)]` and emits no CSS at all.
  // Use the named token colours instead, e.g. `bg-bg-card/95`.
  const offenders: string[] = [];
  for (const file of sourceFiles.filter((f) => f.endsWith(".tsx"))) {
    const text = fs.readFileSync(file, "utf-8");
    for (const [match] of Array.from(text.matchAll(/[a-z]+-\[var\(--[a-z0-9-]+\)\]\/\d+/g))) {
      offenders.push(`${rel(file)}: ${match}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("design tokens: no raw Tailwind palette classes outside the pitch graphics", () => {
  // The pitch is a fixed dark-green surface in both themes, so its line
  // markings and on-pitch labels keep literal colours.
  const PITCH_FILES = new Set([
    "src/components/PitchLineup.tsx",
    "src/components/lineup/LineupBuilderClient.tsx",
  ]);
  const PITCH_CLASSES = new Set([
    "border-emerald-600/30",
    "border-emerald-900/50",
    "border-emerald-900/60",
    "bg-slate-950/90",
    "bg-amber-950/90",
    "border-amber-500/40",
  ]);
  const PALETTE =
    /(?<![\w-])(?:text|bg|border|ring|from|via|to|divide|shadow|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|rose|pink|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia)-\d{2,3}(?:\/\d+)?(?![\w-])/g;

  const offenders: string[] = [];
  for (const file of sourceFiles.filter((f) => f.endsWith(".tsx"))) {
    if (PITCH_FILES.has(rel(file))) continue;
    const text = fs.readFileSync(file, "utf-8");
    for (const [match] of Array.from(text.matchAll(PALETTE))) {
      if (!PITCH_CLASSES.has(match)) offenders.push(`${rel(file)}: ${match}`);
    }
  }
  assert.deepEqual(offenders, []);
});
