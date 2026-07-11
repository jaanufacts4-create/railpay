-- ============================================================
-- RailPay OBHS — Subscription System Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. SUBSCRIPTIONS table
create table if not exists subscriptions (
  id              uuid primary key default gen_random_uuid(),
  contractor_id   uuid references contractors(id) on delete cascade,
  plan            text not null default 'trial',   -- 'trial' | 'basic' | 'pro'
  start_date      date not null default current_date,
  end_date        date not null,
  status          text not null default 'active',  -- 'active' | 'expired' | 'suspended'
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Index for fast contractor lookups
create index if not exists subscriptions_contractor_id_idx on subscriptions(contractor_id);

-- 2. ADMIN_CONFIG table (single-row settings)
create table if not exists admin_config (
  id              integer primary key default 1,
  upi_id          text default '',
  whatsapp_number text default '',
  upi_qr_url      text default '',
  payment_note    text default 'Please pay and send screenshot on WhatsApp.',
  basic_price     integer default 999,
  pro_price       integer default 1999,
  updated_at      timestamptz default now()
);

-- Insert default row (won't duplicate if already exists)
insert into admin_config (id) values (1) on conflict (id) do nothing;

-- 3. RLS Policies

-- Subscriptions: only service_role (server) can read/write
alter table subscriptions enable row level security;

create policy "service_role_all_subscriptions"
  on subscriptions for all
  using (true)
  with check (true);

-- Admin config: only service_role can read/write
alter table admin_config enable row level security;

create policy "service_role_all_admin_config"
  on admin_config for all
  using (true)
  with check (true);

-- ============================================================
-- Done! You should see subscriptions and admin_config tables.
-- ============================================================
