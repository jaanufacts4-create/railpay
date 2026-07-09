-- ============================================================
-- RailPay OBHS — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── contractors ─────────────────────────────────────────────
-- One row per registered contractor (linked to auth.users)
create table if not exists contractors (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  firm_name       text not null default '',
  owner_name      text default '',
  phone           text default '',
  city            text default '',
  designations    text[] default array['Supervisor', 'Housekeeper', 'Cleaner'],
  janitor_rate    numeric default 70.88,
  ehk_rate        numeric,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── employees ───────────────────────────────────────────────
create table if not exists employees (
  id              text primary key,
  contractor_id   uuid references contractors(id) on delete cascade not null,
  emp_id          text default '',
  name            text not null default '',
  designation     text default '',
  per_trip        numeric default 0,
  phone           text default '',
  status          text default 'active',
  remarks         text default '',
  created_at      timestamptz default now()
);

-- ── trips ───────────────────────────────────────────────────
create table if not exists trips (
  id              text primary key,
  contractor_id   uuid references contractors(id) on delete cascade not null,
  emp_id          text not null default '',
  date            text not null default '',
  train_no        text default '',
  route           text default '',
  food            numeric default 0,
  advance         numeric default 0,
  note            text default '',
  created_at      timestamptz default now()
);

-- ── trains ──────────────────────────────────────────────────
create table if not exists trains (
  id              text primary key,
  contractor_id   uuid references contractors(id) on delete cascade not null,
  train_no        text default '',
  name            text default '',
  route           text default '',
  days            text[] default '{}',
  ehk             integer default 1,
  janitors        integer default 0,
  trip_hours      numeric default 0,
  type            text default 'regular',
  valid_from      text,
  valid_to        text,
  cancelled_dates text[] default '{}',
  created_at      timestamptz default now()
);

-- ── min_wages ───────────────────────────────────────────────
create table if not exists min_wages (
  id              text primary key,
  contractor_id   uuid references contractors(id) on delete cascade not null,
  effective_from  text default '',
  ehk             numeric default 0,
  janitor         numeric default 0,
  created_at      timestamptz default now()
);

-- ── penalties ───────────────────────────────────────────────
create table if not exists penalties (
  id              text primary key,
  contractor_id   uuid references contractors(id) on delete cascade not null,
  date            text default '',
  train_no        text default '',
  trip_hours      numeric default 0,
  req_ehk         integer default 0,
  req_jan         integer default 0,
  act_ehk         integer default 0,
  act_jan         integer default 0,
  note            text default '',
  created_at      timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- Each contractor can only see their own data.
-- ============================================================

alter table contractors  enable row level security;
alter table employees    enable row level security;
alter table trips        enable row level security;
alter table trains       enable row level security;
alter table min_wages    enable row level security;
alter table penalties    enable row level security;

-- contractors: user can only access their own row
create policy "contractors: own row only"
  on contractors for all
  using (user_id = auth.uid());

-- helper: check if contractor_id belongs to the current user
create or replace function own_contractor(cid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from contractors where id = cid and user_id = auth.uid()
  );
$$;

-- employees
create policy "employees: own contractor only"
  on employees for all
  using (own_contractor(contractor_id));

-- trips
create policy "trips: own contractor only"
  on trips for all
  using (own_contractor(contractor_id));

-- trains
create policy "trains: own contractor only"
  on trains for all
  using (own_contractor(contractor_id));

-- min_wages
create policy "min_wages: own contractor only"
  on min_wages for all
  using (own_contractor(contractor_id));

-- penalties
create policy "penalties: own contractor only"
  on penalties for all
  using (own_contractor(contractor_id));

-- ============================================================
-- Indexes for performance
-- ============================================================

create index if not exists idx_employees_contractor  on employees(contractor_id);
create index if not exists idx_trips_contractor      on trips(contractor_id);
create index if not exists idx_trips_date            on trips(contractor_id, date);
create index if not exists idx_trains_contractor     on trains(contractor_id);
create index if not exists idx_min_wages_contractor  on min_wages(contractor_id);
create index if not exists idx_penalties_contractor  on penalties(contractor_id);
