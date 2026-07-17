-- Inspecciona las imagenes de unidades cargadas actualmente.
select
  id,
  unit_id,
  image_url,
  storage_path,
  sort_order
from public.unit_images
order by unit_id, sort_order, created_at nulls last, id;

-- Reordena las imagenes para que las que realmente viven en Supabase Storage
-- queden primero y luego normaliza el sort_order por unidad.
with ranked_images as (
  select
    id,
    row_number() over (
      partition by unit_id
      order by
        case when storage_path is not null and storage_path <> '' then 0 else 1 end,
        sort_order asc,
        created_at asc,
        id asc
    ) as next_sort_order
  from public.unit_images
)
update public.unit_images as unit_images
set sort_order = ranked_images.next_sort_order
from ranked_images
where unit_images.id = ranked_images.id;

-- Opcional: elimina filas legacy/mock que no apuntan al bucket real.
-- Revisar primero con el select inicial antes de ejecutar este bloque.
-- delete from public.unit_images
-- where coalesce(storage_path, '') = ''
--   and image_url not like 'https://honkspxurkoyskjaxpdd.supabase.co/storage/v1/object/public/property-media/%';
