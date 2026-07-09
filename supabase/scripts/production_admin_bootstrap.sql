-- Reemplaza el email por el usuario real ya creado en Supabase Auth.
-- Este script promociona el usuario a admin dentro de public.profiles.

do $$
declare
  target_user_id uuid;
  target_email text := 'admin@losalamostilcara.com';
begin
  select users.id
  into target_user_id
  from auth.users as users
  where lower(users.email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No existe un usuario en auth.users con email %', target_email;
  end if;

  insert into public.profiles (id, email, role, full_name)
  select
    users.id,
    users.email,
    'admin'::public.app_role,
    coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name', users.email)
  from auth.users as users
  where users.id = target_user_id
  on conflict (id) do update
    set email = excluded.email,
        role = 'admin'::public.app_role,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);
end $$;

select id, email, role, full_name, created_at
from public.profiles
where lower(email) = lower('admin@losalamostilcara.com');
