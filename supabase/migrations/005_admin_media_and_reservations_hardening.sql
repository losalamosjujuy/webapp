alter table public.unit_images
add column if not exists storage_path text;

alter table public.gallery_items
add column if not exists storage_path text;

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

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public can read property media'
  ) then
    create policy "public can read property media"
    on storage.objects for select
    using (bucket_id = 'property-media');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated staff manage property media uploads'
  ) then
    create policy "authenticated staff manage property media uploads"
    on storage.objects for insert
    with check (bucket_id = 'property-media' and auth.role() = 'authenticated');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated staff manage property media updates'
  ) then
    create policy "authenticated staff manage property media updates"
    on storage.objects for update
    using (bucket_id = 'property-media' and auth.role() = 'authenticated')
    with check (bucket_id = 'property-media' and auth.role() = 'authenticated');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated staff manage property media deletes'
  ) then
    create policy "authenticated staff manage property media deletes"
    on storage.objects for delete
    using (bucket_id = 'property-media' and auth.role() = 'authenticated');
  end if;
end $$;
