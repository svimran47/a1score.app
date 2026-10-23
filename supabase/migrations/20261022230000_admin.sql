-- =============================================================================
-- Migration: 20261022230000_admin.sql
-- Description: Admin Dashboard Blueprint Schema Additions
-- Tables: admin_users, app_config, admin_audit_log, analytics_events, web_vitals
-- Columns: deletedAt on Player, Club, League, Transfer
-- RLS: Strictly locked to service role only.
-- =============================================================================

-- 1. Admin Users & Roles
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- Only service role can read/write this table. No anon/authenticated policies.
revoke all on public.admin_users from anon, authenticated;

-- 2. App Remote Config (Singleton pattern)
create table if not exists public.app_config (
  id                    text primary key default 'default',
  maintenance_mode      boolean not null default false,
  maintenance_message   text not null default 'We are currently performing scheduled maintenance. Please check back shortly.',
  min_supported_version text not null default '1.0.0',
  latest_version        text not null default '1.0.0',
  force_update          boolean not null default false,
  feature_flags         jsonb not null default '{"predict": true, "tv": true, "news": true, "compare": true, "ads": false}'::jsonb,
  updated_at            timestamptz not null default now()
);

alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- Seed default singleton row if not already present
insert into public.app_config (id)
values ('default')
on conflict (id) do nothing;

-- 3. Admin Audit Log
create table if not exists public.admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email   text,
  action        text not null, -- 'create' | 'update' | 'delete' | 'restore' | 'trigger' | 'send'
  entity        text not null, -- 'player' | 'club' | 'league' | 'transfer' | 'market_value' | 'app_config' | 'notification' | 'pipeline' | 'user'
  entity_id     text,
  diff          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

create index if not exists idx_admin_audit_log_entity on public.admin_audit_log (entity, entity_id);
create index if not exists idx_admin_audit_log_created_at on public.admin_audit_log (created_at desc);

-- 4. Analytics & Web Vitals Telemetry Tables
create table if not exists public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
create index if not exists idx_analytics_events_name_time on public.analytics_events (name, created_at desc);

create table if not exists public.web_vitals (
  id         uuid primary key default gen_random_uuid(),
  metric     text not null, -- 'CLS' | 'FID' | 'FCP' | 'LCP' | 'INP' | 'TTFB'
  value      numeric not null,
  rating     text, -- 'good' | 'needs-improvement' | 'poor'
  path       text,
  created_at timestamptz not null default now()
);

alter table public.web_vitals enable row level security;
revoke all on public.web_vitals from anon, authenticated;
create index if not exists idx_web_vitals_metric_time on public.web_vitals (metric, created_at desc);

-- 5. Soft-Delete Columns for Content Entities
alter table if exists public."Player"   add column if not exists "deletedAt" timestamptz;
alter table if exists public."Club"     add column if not exists "deletedAt" timestamptz;
alter table if exists public."League"   add column if not exists "deletedAt" timestamptz;
alter table if exists public."Transfer" add column if not exists "deletedAt" timestamptz;

-- Helpful view/comment for seeding initial admin:
-- INSERT INTO public.admin_users (user_id, role) VALUES ('<USER_UUID>', 'admin') ON CONFLICT (user_id) DO NOTHING;
