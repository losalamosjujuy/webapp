create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'staff');
create type public.reservation_status as enum ('pending', 'confirmed', 'rejected', 'canceled', 'completed', 'no_show');
create type public.block_type as enum ('maintenance', 'owner_use', 'manual_hold');
create type public.inquiry_status as enum ('new', 'contacted', 'converted', 'closed');

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
