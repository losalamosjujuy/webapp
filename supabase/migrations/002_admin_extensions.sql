create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  image_url text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.price_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  prices_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_seasons_valid_dates check (start_date < end_date)
);

create index gallery_items_category_idx on public.gallery_items (category, active, sort_order);
create index price_seasons_dates_idx on public.price_seasons (start_date, end_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger price_seasons_set_updated_at
before update on public.price_seasons
for each row execute function public.set_updated_at();

alter table public.gallery_items enable row level security;
alter table public.price_seasons enable row level security;

create policy "public can read gallery items"
on public.gallery_items for select
using (active = true);

create policy "public can read price seasons"
on public.price_seasons for select
using (true);

create policy "authenticated staff manage gallery items"
on public.gallery_items for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage price seasons"
on public.price_seasons for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
