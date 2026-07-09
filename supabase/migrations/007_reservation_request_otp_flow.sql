do $$
begin
  alter type public.reservation_status add value if not exists 'pending_verification' before 'pending_payment';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.reservation_status add value if not exists 'verified_pending_payment' before 'pending_payment';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.reservation_status add value if not exists 'expired_verification';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.reservation_status add value if not exists 'expired_hold';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.reservation_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending_verification',
  full_name text not null,
  phone text not null,
  email text not null,
  city text,
  country text,
  unit_id uuid not null references public.units (id) on delete restrict,
  check_in date not null,
  check_out date not null,
  adults integer not null check (adults > 0),
  children integer not null default 0 check (children >= 0),
  nights integer not null check (nights > 0),
  subtotal numeric(10, 2) not null default 0,
  cleaning_fee numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null default 0,
  currency text not null default 'ARS',
  special_notes text,
  estimated_arrival_time text,
  verified_channel text,
  verification_expires_at timestamptz,
  verified_at timestamptz,
  reservation_id uuid references public.reservations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_requests_valid_dates check (check_in < check_out)
);

create table if not exists public.contact_verifications (
  id uuid primary key default gen_random_uuid(),
  reservation_request_id uuid not null references public.reservation_requests (id) on delete cascade,
  channel text not null,
  target_email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  verified_at timestamptz,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservation_holds (
  id uuid primary key default gen_random_uuid(),
  reservation_request_id uuid not null references public.reservation_requests (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete set null,
  unit_id uuid not null references public.units (id) on delete cascade,
  check_in date not null,
  check_out date not null,
  status text not null default 'active',
  expires_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_holds_valid_dates check (check_in < check_out)
);

create index if not exists reservation_requests_status_idx
on public.reservation_requests (status, created_at desc);

create index if not exists reservation_requests_unit_dates_idx
on public.reservation_requests (unit_id, check_in, check_out);

create index if not exists contact_verifications_request_idx
on public.contact_verifications (reservation_request_id, created_at desc);

create index if not exists reservation_holds_active_idx
on public.reservation_holds (unit_id, check_in, check_out, expires_at)
where status = 'active';

create trigger reservation_requests_set_updated_at
before update on public.reservation_requests
for each row execute function public.set_updated_at();

create trigger contact_verifications_set_updated_at
before update on public.contact_verifications
for each row execute function public.set_updated_at();

create trigger reservation_holds_set_updated_at
before update on public.reservation_holds
for each row execute function public.set_updated_at();

alter table public.reservation_requests enable row level security;
alter table public.contact_verifications enable row level security;
alter table public.reservation_holds enable row level security;
