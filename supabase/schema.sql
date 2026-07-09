create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'staff');
create type public.reservation_status as enum ('pending_payment', 'pending', 'confirmed', 'rejected', 'canceled', 'completed', 'no_show');
create type public.block_type as enum ('maintenance', 'owner_use', 'manual_hold');
create type public.inquiry_status as enum ('new', 'contacted', 'converted', 'closed');
create type public.payment_provider as enum ('mercado_pago');
create type public.payment_status as enum ('pending', 'authorized', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back', 'expired');
create type public.inventory_source as enum ('system', 'manual', 'channel_sync');
create type public.channel_type as enum ('google_hotel_center', 'booking_com', 'channel_manager', 'gds');
create type public.channel_sync_direction as enum ('push', 'pull');
create type public.channel_sync_status as enum ('pending', 'processing', 'success', 'failed');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role public.app_role not null default 'admin',
  full_name text,
  created_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  city text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text not null,
  description text,
  max_guests integer not null check (max_guests > 0),
  bedrooms integer not null default 1,
  beds text not null,
  bathrooms numeric(4, 1) not null default 1,
  base_price_per_night numeric(10, 2) not null check (base_price_per_night >= 0),
  cleaning_fee numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  category text,
  created_at timestamptz not null default now()
);

create table public.unit_amenities (
  unit_id uuid not null references public.units (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (unit_id, amenity_id)
);

create table public.unit_images (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  image_url text not null,
  storage_path text,
  alt_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null unique,
  guest_id uuid not null references public.guests (id) on delete restrict,
  unit_id uuid not null references public.units (id) on delete restrict,
  source text not null default 'website',
  status public.reservation_status not null default 'pending',
  check_in date not null,
  check_out date not null,
  adults integer not null check (adults > 0),
  children integer not null default 0 check (children >= 0),
  nights integer not null check (nights > 0),
  subtotal numeric(10, 2) not null default 0,
  cleaning_fee numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null default 0,
  currency text not null default 'USD',
  special_requests text,
  estimated_arrival_time text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_valid_dates check (check_in < check_out)
);

create table public.rate_plans (
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

create table public.inventory (
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

create table public.payments (
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

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete cascade,
  provider public.payment_provider not null,
  event_type text not null,
  external_reference text,
  provider_payment_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.channel_connections (
  id uuid primary key default gen_random_uuid(),
  type public.channel_type not null,
  name text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, name)
);

create table public.channel_mappings (
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

create table public.channel_sync_logs (
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

create table public.reservation_status_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  old_status public.reservation_status,
  new_status public.reservation_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  note text
);

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null,
  block_type public.block_type not null default 'manual_hold',
  notes text,
  created_at timestamptz not null default now(),
  constraint availability_blocks_valid_dates check (start_date < end_date)
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  message text not null,
  check_in date,
  check_out date,
  guests_count integer,
  unit_id uuid references public.units (id) on delete set null,
  source text not null default 'website',
  status public.inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  quote text not null,
  rating integer not null check (rating between 1 and 5),
  source text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.pages_content (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  section text not null,
  content_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (page, section)
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  image_url text not null,
  storage_path text,
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

create table public.reservation_requests (
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

create table public.contact_verifications (
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

create table public.reservation_holds (
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

create index reservations_date_idx on public.reservations (check_in, check_out);
create index reservations_status_idx on public.reservations (status);
create index reservations_guest_idx on public.reservations (guest_id, status);
create index rate_plans_unit_idx on public.rate_plans (unit_id, active);
create unique index rate_plans_default_idx on public.rate_plans (unit_id) where is_default = true;
create index inventory_lookup_idx on public.inventory (unit_id, date);
create index inventory_rate_plan_lookup_idx on public.inventory (rate_plan_id, date);
create index payments_reservation_idx on public.payments (reservation_id, status);
create index payments_provider_idx on public.payments (provider, provider_payment_id);
create index payment_events_provider_idx on public.payment_events (provider, provider_payment_id);
create index channel_mappings_connection_idx on public.channel_mappings (channel_connection_id, unit_id);
create unique index channel_mappings_unique_idx
on public.channel_mappings (channel_connection_id, unit_id, coalesce(rate_plan_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index channel_sync_logs_connection_idx on public.channel_sync_logs (channel_connection_id, created_at desc);
create index guests_phone_email_idx on public.guests (phone, email);
create index units_slug_idx on public.units (slug);
create index availability_blocks_dates_idx on public.availability_blocks (unit_id, start_date, end_date);
create index inquiries_status_idx on public.inquiries (status, created_at desc);
create index gallery_items_category_idx on public.gallery_items (category, active, sort_order);
create index price_seasons_dates_idx on public.price_seasons (start_date, end_date);
create index reservation_requests_status_idx on public.reservation_requests (status, created_at desc);
create index reservation_requests_unit_dates_idx on public.reservation_requests (unit_id, check_in, check_out);
create index contact_verifications_request_idx on public.contact_verifications (reservation_request_id, created_at desc);
create index reservation_holds_active_idx on public.reservation_holds (unit_id, check_in, check_out, expires_at)
where status = 'active';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger guests_set_updated_at
before update on public.guests
for each row execute function public.set_updated_at();

create trigger units_set_updated_at
before update on public.units
for each row execute function public.set_updated_at();

create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

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

create trigger price_seasons_set_updated_at
before update on public.price_seasons
for each row execute function public.set_updated_at();

create trigger reservation_requests_set_updated_at
before update on public.reservation_requests
for each row execute function public.set_updated_at();

create trigger contact_verifications_set_updated_at
before update on public.contact_verifications
for each row execute function public.set_updated_at();

create trigger reservation_holds_set_updated_at
before update on public.reservation_holds
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media',
  'property-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.guests enable row level security;
alter table public.units enable row level security;
alter table public.amenities enable row level security;
alter table public.unit_amenities enable row level security;
alter table public.unit_images enable row level security;
alter table public.reservations enable row level security;
alter table public.rate_plans enable row level security;
alter table public.inventory enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.reservation_status_history enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.inquiries enable row level security;
alter table public.testimonials enable row level security;
alter table public.faqs enable row level security;
alter table public.site_settings enable row level security;
alter table public.pages_content enable row level security;
alter table public.gallery_items enable row level security;
alter table public.price_seasons enable row level security;
alter table public.reservation_requests enable row level security;
alter table public.contact_verifications enable row level security;
alter table public.reservation_holds enable row level security;
alter table public.channel_connections enable row level security;
alter table public.channel_mappings enable row level security;
alter table public.channel_sync_logs enable row level security;

create policy "public can read active catalog"
on public.units for select
using (active = true);

create policy "public can read amenities"
on public.amenities for select
using (true);

create policy "public can read unit amenities"
on public.unit_amenities for select
using (true);

create policy "public can read unit images"
on public.unit_images for select
using (true);

create policy "public can read testimonials"
on public.testimonials for select
using (active = true);

create policy "public can read faqs"
on public.faqs for select
using (active = true);

create policy "public can read site content"
on public.pages_content for select
using (true);

create policy "public can read settings"
on public.site_settings for select
using (true);

create policy "public can read gallery items"
on public.gallery_items for select
using (active = true);

create policy "public can read price seasons"
on public.price_seasons for select
using (true);

create policy "public can read rate plans"
on public.rate_plans for select
using (active = true);

create policy "public can read inventory"
on public.inventory for select
using (true);

create policy "public can create inquiries"
on public.inquiries for insert
with check (true);

create policy "authenticated staff manage profiles"
on public.profiles for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage guests"
on public.guests for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage units"
on public.units for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage amenities"
on public.amenities for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage unit amenities"
on public.unit_amenities for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage unit images"
on public.unit_images for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage reservations"
on public.reservations for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

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

create policy "authenticated staff manage reservation history"
on public.reservation_status_history for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage blocks"
on public.availability_blocks for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage inquiries"
on public.inquiries for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage testimonials"
on public.testimonials for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage faqs"
on public.faqs for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage settings"
on public.site_settings for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage content"
on public.pages_content for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage gallery items"
on public.gallery_items for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated staff manage price seasons"
on public.price_seasons for all
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

create policy "public can read property media"
on storage.objects for select
using (bucket_id = 'property-media');

create policy "authenticated staff manage property media uploads"
on storage.objects for insert
with check (bucket_id = 'property-media' and auth.role() = 'authenticated');

create policy "authenticated staff manage property media updates"
on storage.objects for update
using (bucket_id = 'property-media' and auth.role() = 'authenticated')
with check (bucket_id = 'property-media' and auth.role() = 'authenticated');

create policy "authenticated staff manage property media deletes"
on storage.objects for delete
using (bucket_id = 'property-media' and auth.role() = 'authenticated');
