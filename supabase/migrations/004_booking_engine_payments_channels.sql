do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'payment_provider'
  ) then
    create type public.payment_provider as enum ('mercado_pago');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'payment_status'
  ) then
    create type public.payment_status as enum (
      'pending',
      'authorized',
      'in_process',
      'approved',
      'rejected',
      'cancelled',
      'refunded',
      'charged_back',
      'expired'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'inventory_source'
  ) then
    create type public.inventory_source as enum ('system', 'manual', 'channel_sync');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'channel_type'
  ) then
    create type public.channel_type as enum ('google_hotel_center', 'booking_com', 'channel_manager', 'gds');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'channel_sync_direction'
  ) then
    create type public.channel_sync_direction as enum ('push', 'pull');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'channel_sync_status'
  ) then
    create type public.channel_sync_status as enum ('pending', 'processing', 'success', 'failed');
  end if;
end $$;

alter type public.reservation_status add value if not exists 'pending_payment' before 'pending';

create table if not exists public.rate_plans (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  currency text not null default 'ARS',
  pricing_mode text not null default 'per_night',
  base_price_per_night numeric(10, 2) not null default 0 check (base_price_per_night >= 0),
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, code)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  rate_plan_id uuid references public.rate_plans (id) on delete set null,
  date date not null,
  available_units integer not null default 1 check (available_units >= 0),
  stop_sell boolean not null default false,
  closed_to_arrival boolean not null default false,
  closed_to_departure boolean not null default false,
  min_stay integer check (min_stay is null or min_stay > 0),
  max_stay integer check (max_stay is null or max_stay > 0),
  base_rate numeric(10, 2) check (base_rate is null or base_rate >= 0),
  source public.inventory_source not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, rate_plan_id, date)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  provider public.payment_provider not null,
  status public.payment_status not null default 'pending',
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'ARS',
  external_reference text not null,
  checkout_url text,
  provider_preference_id text,
  provider_payment_id text,
  provider_merchant_order_id text,
  paid_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete cascade,
  provider public.payment_provider not null,
  event_type text not null,
  external_reference text,
  provider_payment_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.channel_connections (
  id uuid primary key default gen_random_uuid(),
  type public.channel_type not null,
  name text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, name)
);

create table if not exists public.channel_mappings (
  id uuid primary key default gen_random_uuid(),
  channel_connection_id uuid not null references public.channel_connections (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  rate_plan_id uuid references public.rate_plans (id) on delete set null,
  external_property_id text not null,
  external_room_type_id text,
  external_rate_plan_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channel_sync_logs (
  id uuid primary key default gen_random_uuid(),
  channel_connection_id uuid not null references public.channel_connections (id) on delete cascade,
  direction public.channel_sync_direction not null,
  status public.channel_sync_status not null default 'pending',
  entity_type text not null,
  entity_id text,
  external_reference text,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rate_plans_unit_idx on public.rate_plans (unit_id, active);
create unique index if not exists rate_plans_default_idx on public.rate_plans (unit_id) where is_default = true;
create index if not exists inventory_lookup_idx on public.inventory (unit_id, date);
create index if not exists inventory_rate_plan_lookup_idx on public.inventory (rate_plan_id, date);
create index if not exists payments_reservation_idx on public.payments (reservation_id, status);
create index if not exists payments_provider_idx on public.payments (provider, provider_payment_id);
create index if not exists payment_events_provider_idx on public.payment_events (provider, provider_payment_id);
create index if not exists channel_mappings_connection_idx on public.channel_mappings (channel_connection_id, unit_id);
create unique index if not exists channel_mappings_unique_idx
on public.channel_mappings (channel_connection_id, unit_id, coalesce(rate_plan_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists channel_sync_logs_connection_idx on public.channel_sync_logs (channel_connection_id, created_at desc);

create trigger rate_plans_set_updated_at
before update on public.rate_plans
for each row execute function public.set_updated_at();

create trigger inventory_set_updated_at
before update on public.inventory
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger channel_connections_set_updated_at
before update on public.channel_connections
for each row execute function public.set_updated_at();

create trigger channel_mappings_set_updated_at
before update on public.channel_mappings
for each row execute function public.set_updated_at();

alter table public.rate_plans enable row level security;
alter table public.inventory enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.channel_connections enable row level security;
alter table public.channel_mappings enable row level security;
alter table public.channel_sync_logs enable row level security;

create policy "public can read rate plans"
on public.rate_plans for select
using (active = true);

create policy "public can read inventory"
on public.inventory for select
using (true);

create policy "authenticated staff manage rate plans"
on public.rate_plans for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage inventory"
on public.inventory for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage payments"
on public.payments for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage payment events"
on public.payment_events for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage channel connections"
on public.channel_connections for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage channel mappings"
on public.channel_mappings for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage channel sync logs"
on public.channel_sync_logs for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
