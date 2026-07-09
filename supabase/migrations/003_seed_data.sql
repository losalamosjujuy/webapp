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
on conflict (id) do nothing;

insert into public.unit_images (unit_id, image_url, alt_text, sort_order)
values
  ('11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', 'Habitacion doble', 1),
  ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1505693530683-70b5f9c0f0b0?auto=format&fit=crop&w=1200&q=80', 'Habitacion triple', 1),
  ('33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', 'Cabana familiar', 1),
  ('44444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80', 'Loft con vista', 1)
on conflict do nothing;

insert into public.site_settings (key, value_json)
values
  ('contact', '{"whatsappNumber":"5493881234567","phone":"+54 9 388 123 4567","email":"reservas@losalamostilcara.com","instagramUrl":"https://instagram.com/losalamostilcara","facebookUrl":"https://facebook.com/losalamostilcara"}'),
  ('location', '{"address":"Tilcara, Quebrada de Humahuaca","city":"Tilcara","region":"Jujuy, Argentina","coordinates":{"lat":-23.5774,"lng":-65.3957}}'),
  ('reviews', '{"googleReviewsUrl":"https://www.google.com/search?q=Los+Alamos+Tilcara","googleMapsUrl":"https://www.google.com/maps?q=-23.5774,-65.3957"}'),
  ('general', '{"propertyName":"Los Alamos Tilcara","currency":"ARS - Peso Argentino","timezone":"(GMT-03:00) Buenos Aires","checkInTime":"14:00","checkOutTime":"10:00"}')
on conflict (key) do update set value_json = excluded.value_json, updated_at = now();

insert into public.rate_plans (unit_id, code, name, description, currency, pricing_mode, base_price_per_night, is_default, active)
values
  ('11111111-1111-1111-1111-111111111111', 'DOBLE_STD', 'Tarifa Flexible Doble', 'Tarifa flexible para habitacion doble.', 'ARS', 'per_night', 90000, true, true),
  ('22222222-2222-2222-2222-222222222222', 'TRIPLE_STD', 'Tarifa Flexible Triple', 'Tarifa flexible para habitacion triple.', 'ARS', 'per_night', 110000, true, true),
  ('33333333-3333-3333-3333-333333333333', 'FAM_STD', 'Tarifa Flexible Familiar', 'Tarifa flexible para cabana familiar.', 'ARS', 'per_night', 150000, true, true),
  ('44444444-4444-4444-4444-444444444444', 'LOFT_STD', 'Tarifa Flexible Loft', 'Tarifa flexible para loft con vista.', 'ARS', 'per_night', 120000, true, true)
on conflict (unit_id, code) do nothing;

insert into public.channel_connections (type, name, enabled, config)
values
  ('google_hotel_center', 'Google Hotel Center', false, '{"mode":"feed","bookingLinksEnabled":true}'::jsonb)
on conflict (type, name) do nothing;
