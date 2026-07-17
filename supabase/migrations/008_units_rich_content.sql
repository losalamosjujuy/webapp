alter table public.units
  add column if not exists highlights_json jsonb not null default '[]'::jsonb,
  add column if not exists details_json jsonb not null default '[]'::jsonb;
