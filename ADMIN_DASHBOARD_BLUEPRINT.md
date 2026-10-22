# a1score.app — Admin Dashboard Blueprint

> Hand-off spec for building the admin control plane for the **web app** and the
> **Android/iOS APK**. Written to be executed by an agentic IDE (Antigravity).
> Target repo: `svimran47/a1score.app`.

---

## 0. Context the builder must respect

| Fact | Implication for the dashboard |
|---|---|
| Web app is **Next.js 14 App Router**, `runtime = "edge"` on every route, deployed on **Cloudflare Pages** via `@cloudflare/next-on-pages`. | Admin server code must run on the **edge** (Web APIs only — no Node `fs`, `crypto` node module; use Web Crypto). No long-running jobs in a request. |
| Data layer is **Supabase** (Postgres + Auth + RLS). The public app uses the **anon key** + RLS. | Admin writes need the **service-role key**, which must **never** reach the browser or an `NEXT_PUBLIC_*` var. It lives only in server route handlers / Pages Functions env. |
| Prisma schema models: `Player`, `Club`, `League`, `MarketValueHistory`, `Transfer`, `SeasonStats`, `Injury`, achievements, value snapshots. | These are the CRUD entities the content section manages. |
| **APK is a Capacitor WebView** (`capacitor.config.ts` → `server.url = https://a1score.pages.dev`). | "Controlling the APK" ≈ controlling the web app it loads **+** a thin remote-config layer **+** triggering the release workflow for genuinely new native builds. |
| APK/IPA built by **GitHub Actions** `release-mobile.yml` (`workflow_dispatch` with `version` + `release_notes`, or `v*` tag). | The dashboard triggers mobile releases via the GitHub API, not by building locally. |
| Data sync + integrity are **GitHub Actions** (`daily-squad-sync.yml`, `sync-dataset.yml`) and `tsx` scripts in `scripts/`. | The dashboard surfaces these as "run now" buttons + status, again via GitHub API / `workflow_dispatch`. |
| Push notifications use `web-push`, dispatched by `/api/notifications/cron` gated by `CRON_SECRET`. | Admin gets a compose+send surface and a subscriber view. |
| Existing Supabase auth tables: `user_follows`, `user_settings` (per-user, RLS). No admin role yet. | Add an `admin_users` / role concept (section 3). |
| Health at `/api/health`, `/api/health/detail`; analytics at `/api/analytics/event`, `/api/analytics/vitals`. | Reuse these to populate the dashboard's monitoring + analytics panels. |

---

## 1. Recommended architecture

**Build the admin as a route group inside the existing Next.js app** — `src/app/(admin)/admin/**` — not a separate project.

Why: shares the Supabase client, types, design tokens, image proxy, and deploy pipeline; one repo for Antigravity to reason about. The risk (shipping admin code to public users) is contained by (a) route-group isolation, (b) middleware auth gate, (c) keeping the service-role key only in admin route handlers.

```
src/app/
  (admin)/
    admin/
      layout.tsx            # admin shell: sidebar, auth guard, no public chrome
      page.tsx              # overview / health + KPIs
      players/              # list, [id] edit, new
      clubs/
      leagues/
      transfers/
      values/               # market-value review & snapshots
      notifications/        # compose, subscribers, history
      users/                # account list, moderation
      pipelines/            # trigger + watch GitHub Actions syncs
      mobile/               # remote config + APK releases
      flags/                # feature flags / maintenance mode
      analytics/            # vitals + events dashboards
      audit-log/            # who changed what
  api/
    admin/                  # server-only handlers, SERVICE ROLE lives here
      _lib/guard.ts         # verifyAdmin(req) -> session or 401/403
      players/route.ts
      ...
```

> **Alternative (only if you want a hard security boundary):** deploy `(admin)` as a
> separate Cloudflare Pages project on `admin.a1score.app` from the same repo.
> More isolation, slightly more ops. Default recommendation is the single app above.

---

## 2. Security model (do this first — everything depends on it)

1. **Admin identity.** Add a Postgres table and a membership check:
   ```sql
   create table if not exists public.admin_users (
     user_id uuid primary key references auth.users(id) on delete cascade,
     role    text not null default 'admin' check (role in ('admin','editor','viewer')),
     created_at timestamptz not null default now()
   );
   alter table public.admin_users enable row level security;
   -- only service role reads/writes this table; no anon/authenticated policy.
   revoke all on public.admin_users from anon, authenticated;
   ```
   Seed your own `user_id` once via the Supabase SQL editor.

2. **Edge middleware gate** (`src/middleware.ts`, matcher `['/admin/:path*']`):
   verify the Supabase session cookie, then confirm membership in `admin_users`.
   Not a member → redirect to `/auth` (or 404 to avoid advertising the surface).

3. **Service-role boundary.** Every mutating admin action goes through
   `src/app/api/admin/**`. Those handlers:
   - read `SUPABASE_SERVICE_ROLE_KEY` from edge env (set in Cloudflare Pages →
     Settings → Environment variables, **not** `NEXT_PUBLIC_*`);
   - re-verify admin on the server (`_lib/guard.ts`) — never trust the client;
   - construct a **separate** Supabase client with the service-role key (bypasses
     RLS) used only inside the handler.

4. **Roles.** `viewer` = read-only, `editor` = content CRUD, `admin` = everything
   (users, flags, mobile releases, pipeline triggers). Enforce in `guard.ts`.

5. **Audit everything.** Each write appends to an `admin_audit_log` row
   (`actor_user_id`, `action`, `entity`, `entity_id`, `diff jsonb`, `at`). Section 4.9.

6. **Secrets the dashboard needs** (edge env, server-only):
   `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN` (fine-grained PAT: `actions:write`,
   `contents:read` on this repo only), `CRON_SECRET` (already exists),
   `VAPID_*` push keys.

**Hard rules for the builder:** never put the service-role key, GitHub token, or
VAPID private key in any `NEXT_PUBLIC_*` var or client bundle. Use Web Crypto, not
Node `crypto`. Validate every input with `zod` (already a dependency).

---

## 3. Modules (what each screen does)

### 3.1 Overview (`/admin`)
KPIs + health at a glance: total players/clubs/leagues, data staleness
(`lastSyncedAt`), last successful sync per league, push subscriber count,
current app version vs min-supported version, maintenance-mode state, latest
Web Vitals. Pulls from `/api/health/detail` + a few count queries.

### 3.2 Content management (players / clubs / leagues / transfers / values)
- **List** with search, league/position filters, pagination, sort by market value.
- **Edit/create** forms validated with `zod`, writing through `/api/admin/*`.
- **Market-value review** screen mirrors the existing `market_value_review.csv`
  workflow: approve/reject proposed value changes, write `MarketValueHistory`.
- **Soft-delete + restore** (add `deletedAt`) rather than hard deletes.
- **Bulk import/export** reusing the shape of `scripts/export-dataset.ts` and the
  `applied_*_changes.csv` format.

### 3.3 Data pipelines (`/admin/pipelines`)
- List the GitHub workflows (`daily-squad-sync`, `sync-dataset`, integrity checks).
- **Run now** → `POST actions/workflows/{file}/dispatches` via GitHub API.
- Live status by polling `actions/runs` (show conclusion, duration, logs link).
- Surface `data-validation-report.json` / `audit_summary.md` outputs read-only.

### 3.4 Push notifications (`/admin/notifications`)
- Compose (title, body, deep link, target: all / league / followers of entity).
- Send test to self; send live (server handler signs with VAPID, reuses the
  existing dispatcher in `src/lib/notifications/`).
- Subscriber count + recent sends history.
- Button to trigger the valuation-alert cron on demand (calls the
  `CRON_SECRET`-gated endpoint server-side).

### 3.5 Users & accounts (`/admin/users`)
- List `auth.users` joined with `user_settings` / follow counts.
- View a user's follows; disable/delete account (reuse `delete_my_account` pattern
  but admin-initiated via service role); manage `admin_users` membership (admin role only).
- Read-only by default; destructive actions require a typed confirmation.

### 3.6 Mobile / APK control (`/admin/mobile`) — the "control the APK" core
Two layers:

**A. Remote config (instant, no rebuild).** A single `app_config` row read by both
web and native on launch. Fields:
```
maintenance_mode      boolean        # show full-screen maintenance gate
maintenance_message   text
min_supported_version text           # e.g. "1.2.0" — below this = hard force-update
latest_version        text           # soft "update available" nudge
force_update          boolean
feature_flags         jsonb          # { "predict": true, "tv": false, ... }
updated_at            timestamptz
```
- Serve via a cached public endpoint `GET /api/app-config` (edge, short TTL).
- Native app (Capacitor) fetches it on resume via `@capacitor/app`; compares its
  build version (from `capacitor.config` / `BuildConfig`) to `min_supported_version`
  → shows blocking update screen linking to the GitHub release / store.
- Web reads the same config for maintenance + flags.
- Admin edits this row through `/api/admin/app-config` (service role + audit).

**B. Native releases (rebuild).** Trigger `release-mobile.yml` from the dashboard:
`POST actions/workflows/release-mobile.yml/dispatches` with `{ version, release_notes }`.
Show build progress and the resulting GitHub Release APK URL. After a release,
bump `latest_version` (and `min_supported_version` if forcing) in remote config so
existing installs are nudged/forced.

> Insight to state plainly in the UI: because the APK is a WebView over the Pages
> site, **most changes ship instantly via a normal web deploy** — a native rebuild
> is only needed for Capacitor plugin changes, native config, icons/splash, or the
> loaded `server.url`.

### 3.7 Feature flags & maintenance (`/admin/flags`)
Thin editor over `app_config.feature_flags` + `maintenance_mode`. Flags gate
routes/components (`predict`, `tv`, `news`, `compare`, ads). One toggle affects web
and APK simultaneously.

### 3.8 Analytics (`/admin/analytics`)
Visualize data already collected by `/api/analytics/event` and `/analytics/vitals`
(persist them to a Supabase table if not already): page views, top entities, Web
Vitals (LCP/CLS/INP) trends. Charts with `recharts` (already a dependency).

### 3.9 Audit log (`/admin/audit-log`)
Read-only, filterable feed of `admin_audit_log`. Every mutating handler writes here.

---

## 4. Data model additions (one migration)

Create `supabase/migrations/<ts>_admin.sql` with: `admin_users`, `app_config`
(single-row, seeded), `admin_audit_log`, optional `analytics_events` /
`web_vitals` tables, and `deletedAt` columns for soft-delete. RLS: lock all admin
tables to **service role only** (no anon/authenticated policies); `app_config` gets
a read-only policy or is served through the cached public endpoint.

---

## 5. Build order (milestones for Antigravity)

1. **M1 — Auth spine:** migration (`admin_users`, `app_config`, `admin_audit_log`),
   `middleware.ts` gate, `api/admin/_lib/guard.ts`, service-role client, admin
   layout + empty overview. *Acceptance:* non-admin can't reach `/admin`; admin sees shell.
2. **M2 — Content CRUD:** players first (list/edit/create + audit), then clubs,
   leagues, transfers, values. *Acceptance:* edits persist, RLS still protects public app, audit rows written.
3. **M3 — Remote config + flags + maintenance:** `app_config` editor,
   `GET /api/app-config`, web honors maintenance + flags. *Acceptance:* toggling maintenance gates the live site.
4. **M4 — Mobile:** native-version gate in the Capacitor app, release trigger via
   GitHub API, release history. *Acceptance:* dashboard starts a real `release-mobile` run; old build shows force-update.
5. **M5 — Pipelines + notifications:** workflow trigger/status, push compose/send.
6. **M6 — Users, analytics, audit-log polish.**

Each milestone: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
must pass (see `package.json`). Keep the admin design consistent with `DESIGN.md`
tokens; no hardcoded colors (`npm run lint:colors`).

---

## 6. Explicit non-goals / cautions

- Don't bypass RLS in anything the browser can call — service role stays server-side.
- Don't build a custom build server; reuse GitHub Actions for APK + sync.
- Don't duplicate the data-sync logic in the dashboard; **trigger** the existing
  scripts/workflows and read their reports.
- Keep admin routes out of the sitemap/robots and the public nav.
