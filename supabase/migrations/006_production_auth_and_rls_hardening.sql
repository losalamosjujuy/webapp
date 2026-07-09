create or replace function public.has_role(required_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = any(required_roles)
  );
$$;

grant execute on function public.has_role(public.app_role[]) to anon, authenticated, service_role;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    'staff',
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;

create trigger on_auth_user_profile_sync
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_profile_from_auth_user();

insert into public.profiles (id, email, role, full_name)
select
  users.id,
  users.email,
  coalesce(profiles.role, 'staff'::public.app_role),
  coalesce(profiles.full_name, users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name')
from auth.users as users
left join public.profiles as profiles on profiles.id = users.id
on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name);

drop policy if exists "authenticated staff manage profiles" on public.profiles;
drop policy if exists "authenticated staff manage guests" on public.guests;
drop policy if exists "authenticated staff manage units" on public.units;
drop policy if exists "authenticated staff manage amenities" on public.amenities;
drop policy if exists "authenticated staff manage unit amenities" on public.unit_amenities;
drop policy if exists "authenticated staff manage unit images" on public.unit_images;
drop policy if exists "authenticated staff manage reservations" on public.reservations;
drop policy if exists "authenticated staff manage rate plans" on public.rate_plans;
drop policy if exists "authenticated staff manage inventory" on public.inventory;
drop policy if exists "authenticated staff manage payments" on public.payments;
drop policy if exists "authenticated staff manage payment events" on public.payment_events;
drop policy if exists "authenticated staff manage reservation history" on public.reservation_status_history;
drop policy if exists "authenticated staff manage blocks" on public.availability_blocks;
drop policy if exists "authenticated staff manage inquiries" on public.inquiries;
drop policy if exists "authenticated staff manage testimonials" on public.testimonials;
drop policy if exists "authenticated staff manage faqs" on public.faqs;
drop policy if exists "authenticated staff manage settings" on public.site_settings;
drop policy if exists "authenticated staff manage content" on public.pages_content;
drop policy if exists "authenticated staff manage gallery items" on public.gallery_items;
drop policy if exists "authenticated staff manage price seasons" on public.price_seasons;
drop policy if exists "authenticated staff manage channel connections" on public.channel_connections;
drop policy if exists "authenticated staff manage channel mappings" on public.channel_mappings;
drop policy if exists "authenticated staff manage channel sync logs" on public.channel_sync_logs;
drop policy if exists "authenticated staff manage property media uploads" on storage.objects;
drop policy if exists "authenticated staff manage property media updates" on storage.objects;
drop policy if exists "authenticated staff manage property media deletes" on storage.objects;

create policy "staff manage profiles"
on public.profiles for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage guests"
on public.guests for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage units"
on public.units for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage amenities"
on public.amenities for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage unit amenities"
on public.unit_amenities for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage unit images"
on public.unit_images for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage reservations"
on public.reservations for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage rate plans"
on public.rate_plans for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage inventory"
on public.inventory for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage payments"
on public.payments for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage payment events"
on public.payment_events for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage reservation history"
on public.reservation_status_history for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage blocks"
on public.availability_blocks for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage inquiries"
on public.inquiries for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage testimonials"
on public.testimonials for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage faqs"
on public.faqs for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage settings"
on public.site_settings for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage content"
on public.pages_content for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage gallery items"
on public.gallery_items for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage price seasons"
on public.price_seasons for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage channel connections"
on public.channel_connections for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage channel mappings"
on public.channel_mappings for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage channel sync logs"
on public.channel_sync_logs for all
using (public.has_role(array['admin', 'staff']::public.app_role[]))
with check (public.has_role(array['admin', 'staff']::public.app_role[]));

create policy "staff manage property media uploads"
on storage.objects for insert
with check (
  bucket_id = 'property-media'
  and public.has_role(array['admin', 'staff']::public.app_role[])
);

create policy "staff manage property media updates"
on storage.objects for update
using (
  bucket_id = 'property-media'
  and public.has_role(array['admin', 'staff']::public.app_role[])
)
with check (
  bucket_id = 'property-media'
  and public.has_role(array['admin', 'staff']::public.app_role[])
);

create policy "staff manage property media deletes"
on storage.objects for delete
using (
  bucket_id = 'property-media'
  and public.has_role(array['admin', 'staff']::public.app_role[])
);
