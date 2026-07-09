insert into public.amenities (name, icon, category)
values
  ('Wi-Fi', 'wifi', 'comfort'),
  ('Calefaccion', 'heater', 'comfort'),
  ('Desayuno', 'utensils', 'food'),
  ('Estacionamiento', 'car', 'access'),
  ('Patio y jardin', 'trees', 'outdoor'),
  ('Cocina equipada', 'cooking', 'kitchen'),
  ('Vista a los cerros', 'mountain', 'outdoor'),
  ('Asistencia personalizada', 'heart-handshake', 'service')
on conflict (name) do nothing;

insert into public.units (
  id, name, slug, short_description, description, max_guests, bedrooms, beds, bathrooms, base_price_per_night, cleaning_fee, active
)
values
  ('11111111-1111-1111-1111-111111111111', 'Habitacion Doble', 'habitacion-doble', 'Ideal para parejas que buscan tranquilidad y descanso.', 'Habitacion comoda con cama doble, textiles calidos y ambiente sereno.', 2, 1, '1 cama doble', 1, 90000, 12000, true),
  ('22222222-2222-2222-2222-222222222222', 'Habitacion Triple', 'habitacion-triple', 'Perfecta para amigos o familias pequenas.', 'Unidad con cama doble y cama simple para estadias cortas o medianas.', 3, 1, '1 cama doble + 1 simple', 1, 110000, 12000, true),
  ('33333333-3333-3333-3333-333333333333', 'Cabana Familiar', 'cabana-familiar', 'Espaciosa y equipada para toda la familia.', 'Cabana amplia con sectores diferenciados y cocina equipada.', 4, 2, '2 camas + sofa cama', 1, 150000, 16000, true),
  ('44444444-4444-4444-4444-444444444444', 'Loft con Vista', 'loft-con-vista', 'Loft amplio con vista a los cerros y balcon.', 'Espacio luminoso con balcon y rincones de descanso.', 2, 1, '1 cama doble', 1, 120000, 14000, true)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  short_description = excluded.short_description,
  description = excluded.description,
  max_guests = excluded.max_guests,
  bedrooms = excluded.bedrooms,
  beds = excluded.beds,
  bathrooms = excluded.bathrooms,
  base_price_per_night = excluded.base_price_per_night,
  cleaning_fee = excluded.cleaning_fee,
  active = excluded.active;

insert into public.unit_images (unit_id, image_url, alt_text, sort_order)
values
  ('11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', 'Habitacion doble', 1),
  ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1505693530683-70b5f9c0f0b0?auto=format&fit=crop&w=1200&q=80', 'Habitacion triple', 1),
  ('33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', 'Cabana familiar', 1),
  ('44444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80', 'Loft con vista', 1)
on conflict do nothing;

insert into public.unit_amenities (unit_id, amenity_id)
select unit_id, amenity_id
from (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, (select id from public.amenities where name = 'Wi-Fi')),
    ('11111111-1111-1111-1111-111111111111'::uuid, (select id from public.amenities where name = 'Calefaccion')),
    ('22222222-2222-2222-2222-222222222222'::uuid, (select id from public.amenities where name = 'Wi-Fi')),
    ('22222222-2222-2222-2222-222222222222'::uuid, (select id from public.amenities where name = 'Estacionamiento')),
    ('33333333-3333-3333-3333-333333333333'::uuid, (select id from public.amenities where name = 'Patio y jardin')),
    ('33333333-3333-3333-3333-333333333333'::uuid, (select id from public.amenities where name = 'Cocina equipada')),
    ('44444444-4444-4444-4444-444444444444'::uuid, (select id from public.amenities where name = 'Vista a los cerros')),
    ('44444444-4444-4444-4444-444444444444'::uuid, (select id from public.amenities where name = 'Asistencia personalizada'))
) as pairs(unit_id, amenity_id)
where amenity_id is not null
on conflict do nothing;

insert into public.site_settings (key, value_json)
values
  ('contact', '{"whatsappNumber":"5493881234567","phone":"+54 9 388 123 4567","email":"reservas@losalamostilcara.com","instagramUrl":"https://instagram.com/losalamostilcara","facebookUrl":"https://facebook.com/losalamostilcara"}'),
  ('location', '{"address":"Tilcara, Quebrada de Humahuaca","city":"Tilcara","region":"Jujuy, Argentina","coordinates":{"lat":-23.5774,"lng":-65.3957}}'),
  ('reviews', '{"googleReviewsUrl":"https://www.google.com/search?q=Los+Alamos+Tilcara","googleMapsUrl":"https://www.google.com/maps?q=-23.5774,-65.3957"}'),
  ('general', '{"propertyName":"Los Alamos Tilcara","currency":"ARS - Peso Argentino","timezone":"(GMT-03:00) Buenos Aires","checkInTime":"14:00","checkOutTime":"10:00"}')
on conflict (key) do update set
  value_json = excluded.value_json,
  updated_at = now();

insert into public.pages_content (page, section, content_json)
values
  ('home', 'hero', '{"eyebrow":"Hospedaje en Tilcara","title":"Los Alamos Tilcara","subtitle":"Un lugar para descansar y conectar con la magia de la Quebrada de Humahuaca.","image":"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2000&q=80","trustPoints":["Reserva directa","Atencion personalizada","Ubicacion ideal"]}'),
  ('home', 'about', '{"body":"Hospedaje familiar en Tilcara con atencion personalizada y calidez nortena."}'),
  ('home', 'policies', '{"items":[{"title":"Reserva directa","body":"Las solicitudes se confirman manualmente por el equipo."},{"title":"Cancelacion","body":"Las cancelaciones se revisan segun la temporada y la anticipacion."}]}')
on conflict (page, section) do update set
  content_json = excluded.content_json,
  updated_at = now();

insert into public.faqs (question, answer, sort_order, active)
values
  ('Cual es el horario de check-in?', 'El check-in comienza a las 14:00. Si llegas antes, consultanos por disponibilidad.', 1, true),
  ('Como se confirma una reserva?', 'La reserva se solicita online y el equipo la confirma manualmente por WhatsApp o email.', 2, true),
  ('Tienen estacionamiento?', 'Si, contamos con espacios limitados y sujetos a confirmacion segun la unidad.', 3, true)
on conflict do nothing;

insert into public.testimonials (guest_name, quote, rating, source, active, sort_order)
values
  ('Mariana, Buenos Aires', 'Un lugar hermoso, super tranquilo y muy bien ubicado. La atencion de 10, sin duda volveremos.', 5, 'google', true, 1),
  ('Lucas, Cordoba', 'La cabana tiene todo lo necesario y las vistas son increibles. Recomendadisimo.', 5, 'google', true, 2),
  ('Ana y Pedro, Mendoza', 'Nos sentimos como en casa. Tilcara es magico y Los Alamos lo hace aun mejor.', 5, 'google', true, 3)
on conflict do nothing;

insert into public.gallery_items (title, category, image_url, sort_order, active)
values
  ('Patio interior', 'inicio', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', 1, true),
  ('Interior calido', 'alojamientos', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', 2, true),
  ('Terraza con vista', 'entorno', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 3, true),
  ('Dormitorio principal', 'alojamientos', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', 4, true)
on conflict do nothing;

insert into public.price_seasons (name, start_date, end_date, prices_json)
values
  ('Temporada Baja', '2026-05-01', '2026-06-30', '{"11111111-1111-1111-1111-111111111111":90000,"22222222-2222-2222-2222-222222222222":100000,"33333333-3333-3333-3333-333333333333":130000,"44444444-4444-4444-4444-444444444444":100000}'),
  ('Temporada Media', '2026-07-01', '2026-08-31', '{"11111111-1111-1111-1111-111111111111":100000,"22222222-2222-2222-2222-222222222222":120000,"33333333-3333-3333-3333-333333333333":160000,"44444444-4444-4444-4444-444444444444":130000}')
on conflict do nothing;

insert into public.rate_plans (unit_id, code, name, description, currency, pricing_mode, base_price_per_night, is_default, active)
values
  ('11111111-1111-1111-1111-111111111111', 'DOBLE_STD', 'Tarifa Flexible Doble', 'Tarifa flexible para habitacion doble.', 'ARS', 'per_night', 90000, true, true),
  ('22222222-2222-2222-2222-222222222222', 'TRIPLE_STD', 'Tarifa Flexible Triple', 'Tarifa flexible para habitacion triple.', 'ARS', 'per_night', 110000, true, true),
  ('33333333-3333-3333-3333-333333333333', 'FAM_STD', 'Tarifa Flexible Familiar', 'Tarifa flexible para cabana familiar.', 'ARS', 'per_night', 150000, true, true),
  ('44444444-4444-4444-4444-444444444444', 'LOFT_STD', 'Tarifa Flexible Loft', 'Tarifa flexible para loft con vista.', 'ARS', 'per_night', 120000, true, true)
on conflict (unit_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  currency = excluded.currency,
  pricing_mode = excluded.pricing_mode,
  base_price_per_night = excluded.base_price_per_night,
  is_default = excluded.is_default,
  active = excluded.active,
  updated_at = now();

insert into public.channel_connections (type, name, enabled, config)
values
  ('google_hotel_center', 'Google Hotel Center', false, '{"mode":"feed","bookingLinksEnabled":true}'::jsonb)
on conflict (type, name) do update set
  config = excluded.config,
  updated_at = now();

insert into public.availability_blocks (unit_id, start_date, end_date, reason, block_type, notes)
values
  ('11111111-1111-1111-1111-111111111111', '2026-06-05', '2026-06-10', 'Mantenimiento', 'maintenance', 'Mantenimiento preventivo'),
  ('33333333-3333-3333-3333-333333333333', '2026-07-15', '2026-07-20', 'Evento privado', 'manual_hold', 'Bloqueo interno')
on conflict do nothing;

insert into public.inquiries (full_name, phone, email, message, source, status)
values
  ('Camila Ruiz', '+54 9 388 123 4567', 'camila@email.com', 'Quiero saber si hay lugar para el fin de semana largo.', 'website', 'new'),
  ('Jorge Martinez', '+54 9 380 234 5678', 'jorge@email.com', 'Somos 4 y queremos cocina equipada.', 'whatsapp', 'contacted')
on conflict do nothing;
