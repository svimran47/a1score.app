# a1score.app — Design System & Component Guidelines

> **"Money meets the pitch."**
> A modern, content-first sports intelligence interface synthesizing match events with player market valuations and transfer records. Shares the native app's Royal palette and Flashscore-style density.

---

## 1. Design Philosophy

- **Tonal Separation over Borders:** Containers, cards, and sections are differentiated by subtle background tone steps (`--bg-page` → `--bg-card` → `--bg-chip` → `--bg-hover`) rather than rigid outer borders or heavy drop shadows.
- **Valuation Prominence:** Player and club market valuations are treated as primary signals, rendered prominently in the Royal violet (`--value-text`) with Oxanium figures, always using tabular figures (`tabular-nums`) to prevent horizontal jitter.
- **High Information Density & Clean Hierarchy:** Compact rows with 56px standardized touch heights, clear two-line hierarchy (primary title in bold, metadata and context in muted text), and crisp badge indicators.
- **Strict Accessibility (WCAG 2.1 AA):** Minimum 4.5:1 contrast across dark and light modes, minimum 44px interactive tap targets on touch devices, visible focus rings on all interactive elements, and multi-modal indicators (color is never the sole carrier of information).

---

## 2. Design Tokens (`tokens.css`)

The design system uses a 3-layer token architecture: **Primitives** → **Semantic Tokens** → **Component Tokens**.

### Royal palette (2026-10-30)

The website shares the native app's **Royal** palette and type pairing, so web and app read as one brand. `src/app/tokens.css` is the source of truth; this table is a summary.

| Token | Dark (default) | Light | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-chrome` | `#1e1240` | `#1e1240` | Top bar and hero bands (`.chrome` class), same in both themes |
| `--bg-page` | `#0f0a1f` | `#f0f2f5` | Page background |
| `--bg-card` | `#1a1330` | `#ffffff` | Cards |
| `--bg-chip` / `--bg-elevated` | `#241a40` | `#f3eeff` / `#f0f2f5` | Chips, inset panels |
| `--bg-hover` | `#2a1f4d` | `#f3eeff` | Hover |
| `--divider` | `#2a2145` | `#e6e8ec` | Hairlines |
| `--text-primary` | `#f4f1ff` | `#0e1a2b` | Titles |
| `--text-secondary` | `#c4bdd9` | `#4b5565` | Supporting copy |
| `--text-muted` | `#9a92b3` | `#5b6472` | Metadata |
| `--accent` | `#a78bfa` | `#7c3aed` | Active chips, links, logo |
| `--value-text` | `#a78bfa` | `#6d28d9` | Market values and fees |
| `--live` | `#fb7185` | `#ce1240` | Live minute and pulse |
| `--trend-up` / `--trend-down` | `#32d583` / `#f97066` | `#067647` / `#b42318` | Value movement |

`.chrome` re-points the text, chip, hover and accent tokens for content on the purple chrome, so any component placed inside it adapts without extra classes.

### Typography

- **Figtree** (`--font-sans`) for all UI copy.
- **Oxanium** (`--font-figure`, via the `.figure` utility) for scores, fees and market values, always with tabular figures.
- Both load through `next/font` in `src/app/layout.tsx`.

### Radii and density

`--radius-sm/md/lg` are 6/8/12px, cards use 12px corners and 16px padding, and rows are 56px tall, in line with the app's Flashscore-style density.

### Layer 3: Component Dimensions

```css
--card-radius: var(--radius-lg); /* 20px */
--card-padding: var(--space-5);  /* 20px */
--chip-radius: var(--radius-pill); /* 999px */
--chip-height: 40px;             /* 44px on touch viewport */
--row-height: 64px;              /* Standard list row height */
--nav-height: 72px;              /* FotMob-style sticky top nav */
--container-max: 1280px;         /* Centered desktop layout */
--rail-left: 260px;              /* Desktop left navigation rail */
--rail-right: 320px;             /* Desktop right widgets rail */
--gap: var(--space-4);           /* 16px desktop column gap */
```

---

## 3. Layout Grid & Shell Architecture

```
Desktop (>= 1024px):
+--------------------------------------------------------------------------+
| TopNav (Sticky 72px, max-width 1280px)                                  |
+--------------------------------------------------------------------------+
| LeftRail (260px)   | Main Content (min-w-0 1fr)   | RightRail (320px)    |
| - Top Competitions | - Hero banner                | - Latest News (4)    |
| - Quick Navigation | - Filter chips               | - Value Movers (5)   |
|                    | - Core data tables / cards   |                      |
+--------------------------------------------------------------------------+
| Footer (Explore links, legal, data sources)                             |
+--------------------------------------------------------------------------+

Note: Tailwind's `sm` breakpoint is 480px in this project (see tailwind.config.ts).

Desktop (1024px to 1279px):
- TopNav links are hidden; the LeftRail Quick Links carry primary navigation.
- TopNav links appear at 1280px, with short labels until 2xl (1536px).

Tablet (480px to 1023px):
- Left and right rails collapse.
- Horizontal TabletLeaguesScroller appears below TopNav.
- Fixed BottomNav stays visible (content width capped at 576px).
- Right rail widgets stack below main content.

Mobile (< 480px):
- Single column feed.
- Fixed BottomNav (56px) with 5 primary touch destinations and a live-match badge.
- Expandable "More" sheet drawer for secondary destinations.
- AppShell bottom padding (56px + safe-area inset) keeps content and footer clear of the BottomNav below 1024px.
```

---

## 4. UI Components Catalog

All shared primitive components reside under `src/components/ui/` and are showcased interactively at `/styleguide`.

### 1. `Card`
- Single surface token: `bg-[var(--bg-card)]`
- Radius: `rounded-[var(--card-radius)]` (20px)
- Padding: `p-[var(--card-padding)]` (20px)
- Borderless in dark mode; no hard drop shadows.

### 2. `Chip`
- Height: `h-10 min-h-[44px] sm:min-h-[40px]`
- Shape: Full pill (`rounded-[var(--chip-radius)]`)
- Active State: `bg-[var(--accent)] text-[var(--accent-contrast)]`
- Inactive State: `bg-[var(--bg-chip)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]`
- Focus: `focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`

### 3. Row Components
- **`MatchRow`:** Time/Live status, Team names + logos, Live score or kickoff time, market value badges.
- **`PlayerRow`:** Rank/Shirt #, Avatar, Name, Position, Club name + crest, Market valuation in amber with trend indicator.
- **`ClubRow`:** Rank, Crest, Club name, Senior squad size, Total squad valuation.
- **`TransferRow`:** Date, Player avatar + name, Origin club → Destination club, Fee badge (Fee / Loan / Free).
- **`NewsCardRow`:** 96px fixed aspect thumbnail, Entity tag, 2-line headline, Source + relative time, outbound link indicator.

### 4. Skeletons & Loading Feedback
- Skeletons use animated pulse over `bg-[var(--bg-elevated)]` with matching border-radii (`CardSkeleton`, `MatchRowSkeleton`, `PlayerRowSkeleton`, `ClubRowSkeleton`, `TransferRowSkeleton`).
- Never leave operations taking >300ms without visual skeleton or inline spinner feedback.

### 5. Empty & Error States
- **`EmptyState`:** Plain sentence case copy (e.g. "No matches scheduled for this date."), muted icon, optional actionable button. No exclamation marks.
- **`ErrorState`:** "Couldn't load data right now." with clear retry link.

---

## 5. Accessibility (A11y) Rules

1. **Contrast Ratio:** Text must maintain >= 4.5:1 contrast against surrounding surfaces in both dark and light modes.
2. **Focus Indicators:** Interactive elements must display a 2px outline using `var(--focus-ring)` when focused via keyboard (`:focus-visible`). Never remove outlines without providing this ring.
3. **Touch Targets:** All clickable links, buttons, and chips must measure at least 44px by 44px on mobile viewports with >= 8px spacing.
4. **Non-Color Conveyance:**
   - **Trends:** Use arrow symbols (`▲` / `▼`), mathematical signs (`+` / `−`), and percentage text alongside green/red colors.
   - **Live Matches:** Use explicit "LIVE" text or minute marks (e.g., `64'`) alongside pulsing green dots.
   - **Errors:** Use alert icons and descriptive text alongside red styling.
5. **Charts & Visualizations:**
   - Always supply screen-reader accessible summaries (`<p className="sr-only">...</p>`).
   - Recharts tooltips display exact numbers with currency symbols and date context.
   - Recharts is never in a page's initial bundle: load charts through a client `next/dynamic` wrapper with `ssr: false` (see `ValueChartLazy`), with a skeleton of exactly the chart's height (`ChartSkeleton`) so loading causes no layout shift.
   - Plot only real data points. Never add a synthetic "today" point; step lines (not monotone curves) for values that change on discrete dates; time axes are true time scales, not categories.
6. **Landmarks & Skip Link:**
   - Semantic HTML5 landmarks: `<header>`, `<nav>`, `<main id="main-content">`, `<aside>`, `<footer>`.
   - Accessible skip link positioned at the top of the DOM: `<a href="#main-content">Skip to content</a>`.

---

## 6. Motion & Animation Rules

- **Allowed Properties:** Animate exclusively `opacity` and `transform`.
- **Prohibited Properties:** Never animate layout properties (`width`, `height`, `margin`, `padding`, `top`, `left`).
- **Duration & Timing:** 120ms to 200ms using `var(--ease-out)` (`cubic-bezier(0.2, 0.8, 0.2, 1)`).
- **Reduced Motion:** When `prefers-reduced-motion: reduce` is detected, animations and transitions are collapsed to instantaneous (`0.01ms !important`).

---

## 7. Token Hygiene & Automated Verification

- **Zero Hardcoded Colors:** Never write hardcoded hex values (`#fff`, `#000`, `#ffb020`), RGB/RGBA literals, or Tailwind color family classes (`text-slate-400`, `bg-gray-900`) inside UI components.
- **Color Linter:** Enforced by running:
  ```bash
  npm run lint:colors
  ```
  This scans all 80+ component files to ensure 100% compliance with CSS variables.
- **Token Integrity Test:** `tests/design-tokens.test.ts` (part of `npm run test:unit`) fails when
  - a `var(--x)` is used but never defined (it would silently resolve to inherit/initial),
  - an arbitrary colour carries an opacity modifier such as `bg-[var(--bg-card)]/95` (Tailwind 3 emits nothing for it),
  - a raw palette class (`text-slate-400`, `bg-emerald-500/15`) appears outside the pitch graphics.
- **Opacity on tokens:** Use the named Tailwind colours, which go through `color-mix()`, for example
  `bg-bg-card/95`, `border-divider/60`, `bg-trend-up/15`, `ring-value-text/40`.

---

## 8. Performance Guardrails & Lighthouse CI

### Budgets & Metrics (`perf-budget.json`)
The application enforces strict performance limits across bundle sizes, static assets, and Core Web Vitals:
- **Route JS Limits (gzipped):**
  - `/` (Home): <= 200 kB
  - `/values` (Market Values directory): <= 250 kB
  - `/players/[slug]` (Player Detail): <= 250 kB
  - `/clubs/[id]` (Club Detail): <= 200 kB
  - `/news` (News Hub): <= 200 kB
- **Asset Limits:**
  - Single image weight: <= 250 kB
  - Font weight: <= 100 kB
- **Lighthouse CI Mobile Thresholds:**
  - Performance score: >= 85
  - Accessibility score: >= 95
  - Largest Contentful Paint (LCP): <= 2.5s
  - Cumulative Layout Shift (CLS): <= 0.1
  - Total Blocking Time (TBT): <= 300ms

### Running Local Verification
1. **Build the production bundle:**
   ```bash
   npm run build
   ```
2. **Verify bundle sizes and static asset weights against budgets:**
   ```bash
   npm run perf:budget
   ```
3. **Execute local Lighthouse CI audit on mobile emulation:**
   ```bash
   npm run lhci:mobile
   ```
   Reports and trace artifacts are generated inside `.lighthouseci/`.

---

## 9. Mobile Page Headers

To ensure high information density, content prominence, and zero viewport waste on mobile devices, entity profiles (Players, Clubs, Leagues) follow strict mobile header rules:

### 1. Height & Visibility Budget
- **Maximum Vertical Height:** The header card must fit in **at most ~220px of height on a 390px-wide viewport** (e.g. iPhone 12/13/14/15), guaranteeing that the primary interactive tabs and first content rows are immediately visible above the fold without requiring user scrolling.
- **Scroll Behavior:** The header card scrolls away naturally with the page; navigation and interactive tab bars stick beneath the top navigation bar with `--ease-out` transitions.
- **Safe-Area Insets:** Respects `env(safe-area-inset-top)` and bottom navigation clearance (`pb-20 sm:pb-0`).

### 2. Information Hierarchy
- **Visual Anchor (Avatar / Crest):** Maximum 56px dimension on mobile (`w-14 h-14`), expanding to at most 64px (`w-16 h-16`) on desktop. Always uses strict dimensions to guarantee **Zero CLS** (Cumulative Layout Shift) with placeholder skeleton backgrounds (`--bg-chip`).
- **Entity Name:** Clear bold hierarchy (`--text-primary`), maximum 2 lines (`line-clamp-2`), with graceful ellipsis truncation for long names. Never triggers horizontal overflow or text clipping.
- **Key Metadata:** One clean, concise horizontal line of secondary context (`--text-secondary`):
  - *Player:* Position & Nationality • Current Club & League • Age
  - *Club:* Country • League • Active Squad Size • Avg Age
  - *League:* Country • Tier • Club Count • Season
- **Primary Value Signal (Valuation):** Rendered prominently in brand amber (`--value-text`), always using `tabular-nums` figures, accompanied by a directional trend indicator (`--trend-positive` / `--trend-negative`) or freshness badge (`ValuationFreshness`).

### 3. Action Bar Standards
- **Unified Action Row:** Action controls (Follow button, Share trigger) are consolidated in a single horizontal row on both mobile and desktop.
- **Minimum Tap Targets:** All interactive buttons guarantee **44px minimum tap targets** (WCAG 2.1 AA requirement).
- **No Secondary Wrapping:** Actions never wrap into an awkward secondary row on small viewports (down to 320px width).

### 4. Shared Polymorphic Architecture
- Implemented as a single, reusable `PageHeader` component in `src/components/ui/PageHeader.tsx` supporting `club`, `league`, and `directory` variants. Duplicate header markup is eliminated.
- **Players use `PlayerHero`** (`src/components/players/PlayerHero.tsx`): one value figure (`ValueFigure`), a dated delta (`TrendDelta`, built from `describeDelta`), and Follow / Compare / Share chips. Layout is driven by the `@container/profile` container at 560px, not the viewport, so it adapts to the column it sits in. Below 560px the actions sit on their own row; from 560px the name takes the full top row and the actions sit beside the value.

### 5. One-Page Profile & Section Bar
- Entity profiles are **one scrolling page, not tabs**. Each block is a `ProfileSection` (`<section id aria-labelledby data-nav-label>` with a single `h2`); a section with no data renders **nothing** — no heading, no chip, no "no data" filler.
- `ProfileSectionNav` is a sticky bar of plain `#anchor` links (works without JS) under the TopNav, with scrollspy via `aria-current="location"`, focus moved to the section `h2` after a jump, and a mini value pill once the hero scrolls away. Streamed sections (e.g. Season inside `<Suspense>`) add their own chip when they mount.
- Long lists collapse behind native `<details>` (`ProfileDisclosure`): zero JS, content stays in the static HTML.
- All sections render from one server-built view model (`PlayerProfileVM`, `src/lib/data/playerProfile.ts`) where `null` means "not on record". Formatting goes through `src/lib/format-value.ts` (U+2212 minus, en-GB dates in UTC).

---

## 10. Ad Slot Standards & Placement Guardrails

To preserve platform speed, clean typography, and zero-distraction market intelligence, optional promotional or sponsorship ad slots (configured behind the `NEXT_PUBLIC_ADS_ENABLED=false` feature flag) adhere to strict layout guardrails:

### 1. Mandatory Placement Invariants
- **Never Above the Main Valuation Block:** The primary valuation card, player profile header, club crest, and key meta must always command initial viewport priority. Ads are strictly prohibited above the fold or above valuation metrics.
- **Never Inside Tables or Rows:** Ad slots must never interrupt tabular listings (match fixtures, player transfer ledgers, squad rosters, league standings tables, or compare matrices).
- **Max 1 Per Viewport on Mobile:** At no point may multiple ad slots occupy a single visible viewport on mobile devices (<= 768px).
- **Prohibited on Watchlist and Settings:** Personal utility surfaces—including `/watchlist`, notification management, and user preferences—are permanent ad-free safe zones.

### 2. Zero-CLS Reserved Containers
- Every ad slot must render a strictly reserved, fixed-height container (`min-h-[250px]` for rectangles, `min-h-[90px]` for horizontal leaderboards).
- When `NEXT_PUBLIC_ADS_ENABLED=false`, the slot returns `null`, adding zero markup to the DOM.
- When enabled, the fixed height prevents any Cumulative Layout Shift (CLS) when creative assets load.
- Containers are labeled with an explicit text badge: `Advertisement` in `--text-muted` uppercase micro-copy.

### 3. Deferred Script Execution
- Third-party ad scripts are never included in initial HTML head or hydration bundles.
- Scripts are lazily loaded only after first user interaction (pointerdown, keydown, scroll) or post-LCP `requestIdleCallback`, preserving Lighthouse Core Web Vitals budgets.



