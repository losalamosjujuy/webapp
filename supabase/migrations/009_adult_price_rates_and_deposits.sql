create table if not exists public.adult_price_rates (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  adults integer not null check (adults > 0),
  price_per_night numeric(10, 2) not null check (price_per_night >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, adults)
);

alter table public.reservations
  add column if not exists adults_price_rate_id uuid references public.adult_price_rates (id) on delete set null,
  add column if not exists price_per_night numeric(10, 2) not null default 0 check (price_per_night >= 0),
  add column if not exists deposit_percentage numeric(5, 2) not null default 10 check (deposit_percentage > 0 and deposit_percentage <= 100),
  add column if not exists deposit_amount numeric(10, 2) not null default 0 check (deposit_amount >= 0);

alter table public.reservation_requests
  add column if not exists adults_price_rate_id uuid references public.adult_price_rates (id) on delete set null,
  add column if not exists price_per_night numeric(10, 2) not null default 0 check (price_per_night >= 0),
  add column if not exists deposit_percentage numeric(5, 2) not null default 10 check (deposit_percentage > 0 and deposit_percentage <= 100),
  add column if not exists deposit_amount numeric(10, 2) not null default 0 check (deposit_amount >= 0);

create index if not exists adult_price_rates_unit_idx on public.adult_price_rates (unit_id, active);

create trigger adult_price_rates_set_updated_at
before update on public.adult_price_rates
for each row execute function public.set_updated_at();

alter table public.adult_price_rates enable row level security;

create policy "public can read adult price rates"
on public.adult_price_rates for select
using (active = true);

create policy "authenticated staff manage adult price rates"
on public.adult_price_rates for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

insert into public.adult_price_rates (unit_id, adults, price_per_night, active)
select
  units.id,
  series.adults,
  units.base_price_per_night,
  true
from public.units
cross join lateral generate_series(1, units.max_guests) as series(adults)
on conflict (unit_id, adults) do nothing;

update public.reservations
set
  price_per_night = case when nights > 0 then subtotal / nights else 0 end,
  deposit_amount = case
    when deposit_amount = 0 and total_amount > 0
      then ceil(total_amount * (deposit_percentage / 100))
    else deposit_amount
  end
where price_per_night = 0 or deposit_amount = 0;

update public.reservation_requests
set
  price_per_night = case when nights > 0 then subtotal / nights else 0 end,
  deposit_amount = case
    when deposit_amount = 0 and total_amount > 0
      then ceil(total_amount * (deposit_percentage / 100))
    else deposit_amount
  end
where price_per_night = 0 or deposit_amount = 0;
