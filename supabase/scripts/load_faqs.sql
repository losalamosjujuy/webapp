begin;

delete from public.faqs;

insert into public.faqs (question, answer, sort_order, active)
values
  ('Cual es el horario de check-in?', 'El check-in comienza a las 14:00 hs. Si necesitas ingresar antes, consultanos previamente y verificaremos la disponibilidad.', 1, true),
  ('Cual es el horario de check-out?', 'El check-out se realiza hasta las 10:00 hs. Si necesitas extender tu estadia, comunicate con nosotros para evaluar la disponibilidad.', 2, true),
  ('Como se confirma una reserva?', 'Podes solicitar tu reserva desde la web. La misma queda confirmada una vez validado el pago de la sena y recibas nuestra confirmacion por WhatsApp o correo electronico.', 3, true),
  ('Que medios de pago aceptan?', 'Aceptamos transferencias bancarias y otros medios de pago. Consultanos para conocer las opciones disponibles al momento de reservar.', 4, true),
  ('Se necesita una sena para reservar?', 'Si. Para garantizar la reserva solicitamos una sena. El monto y las condiciones seran informados durante el proceso de reserva.', 5, true),
  ('Puedo cancelar o modificar mi reserva?', 'Si, aunque las condiciones dependen de la anticipacion con la que se solicite el cambio. Te recomendamos consultar nuestra politica de cancelacion antes de confirmar la reserva.', 6, true),
  ('El desayuno esta incluido?', 'Si, el desayuno esta incluido cuando asi se indique en la tarifa seleccionada. Si tenes dudas, podes consultarnos antes de reservar.', 7, true),
  ('Tienen estacionamiento?', 'Si, contamos con estacionamiento sujeto a disponibilidad.', 8, true),
  ('Aceptan mascotas?', 'Depende de la unidad y de la disponibilidad. Consultanos antes de realizar la reserva.', 9, true),
  ('Hay Wi-Fi?', 'Si, ofrecemos conexion Wi-Fi gratuita para todos nuestros huespedes.', 10, true),
  ('Las habitaciones cuentan con bano privado?', 'Si, todas nuestras habitaciones disponen de bano privado y las comodidades indicadas en la descripcion.', 11, true),
  ('Donde estan ubicados?', 'Nos encontramos en Tilcara, Jujuy, en una ubicacion ideal para recorrer la Quebrada de Humahuaca y sus principales atractivos.', 12, true),
  ('Como puedo comunicarme?', 'Podes escribirnos por WhatsApp, completar el formulario de contacto de la web o enviarnos un correo electronico. Respondemos lo antes posible.', 13, true),
  ('Que lugares turisticos hay cerca?', 'Desde nuestro alojamiento podras visitar el Pucara de Tilcara, el centro historico, mercados artesanales, senderos y otros atractivos de la Quebrada de Humahuaca.', 14, true),
  ('Puedo reservar para grupos o familias?', 'Si. Contamos con opciones para parejas, familias y grupos. Contactanos para ayudarte a elegir la mejor alternativa.', 15, true);

insert into public.pages_content (page, section, content_json)
values (
  'home',
  'faqs',
  '{
    "items": [
      {"id":"faq-1","question":"Cual es el horario de check-in?","answer":"El check-in comienza a las 14:00 hs. Si necesitas ingresar antes, consultanos previamente y verificaremos la disponibilidad."},
      {"id":"faq-2","question":"Cual es el horario de check-out?","answer":"El check-out se realiza hasta las 10:00 hs. Si necesitas extender tu estadia, comunicate con nosotros para evaluar la disponibilidad."},
      {"id":"faq-3","question":"Como se confirma una reserva?","answer":"Podes solicitar tu reserva desde la web. La misma queda confirmada una vez validado el pago de la sena y recibas nuestra confirmacion por WhatsApp o correo electronico."},
      {"id":"faq-4","question":"Que medios de pago aceptan?","answer":"Aceptamos transferencias bancarias y otros medios de pago. Consultanos para conocer las opciones disponibles al momento de reservar."},
      {"id":"faq-5","question":"Se necesita una sena para reservar?","answer":"Si. Para garantizar la reserva solicitamos una sena. El monto y las condiciones seran informados durante el proceso de reserva."},
      {"id":"faq-6","question":"Puedo cancelar o modificar mi reserva?","answer":"Si, aunque las condiciones dependen de la anticipacion con la que se solicite el cambio. Te recomendamos consultar nuestra politica de cancelacion antes de confirmar la reserva."},
      {"id":"faq-7","question":"El desayuno esta incluido?","answer":"Si, el desayuno esta incluido cuando asi se indique en la tarifa seleccionada. Si tenes dudas, podes consultarnos antes de reservar."},
      {"id":"faq-8","question":"Tienen estacionamiento?","answer":"Si, contamos con estacionamiento sujeto a disponibilidad."},
      {"id":"faq-9","question":"Aceptan mascotas?","answer":"Depende de la unidad y de la disponibilidad. Consultanos antes de realizar la reserva."},
      {"id":"faq-10","question":"Hay Wi-Fi?","answer":"Si, ofrecemos conexion Wi-Fi gratuita para todos nuestros huespedes."},
      {"id":"faq-11","question":"Las habitaciones cuentan con bano privado?","answer":"Si, todas nuestras habitaciones disponen de bano privado y las comodidades indicadas en la descripcion."},
      {"id":"faq-12","question":"Donde estan ubicados?","answer":"Nos encontramos en Tilcara, Jujuy, en una ubicacion ideal para recorrer la Quebrada de Humahuaca y sus principales atractivos."},
      {"id":"faq-13","question":"Como puedo comunicarme?","answer":"Podes escribirnos por WhatsApp, completar el formulario de contacto de la web o enviarnos un correo electronico. Respondemos lo antes posible."},
      {"id":"faq-14","question":"Que lugares turisticos hay cerca?","answer":"Desde nuestro alojamiento podras visitar el Pucara de Tilcara, el centro historico, mercados artesanales, senderos y otros atractivos de la Quebrada de Humahuaca."},
      {"id":"faq-15","question":"Puedo reservar para grupos o familias?","answer":"Si. Contamos con opciones para parejas, familias y grupos. Contactanos para ayudarte a elegir la mejor alternativa."}
    ]
  }'::jsonb
)
on conflict (page, section) do update set
  content_json = excluded.content_json,
  updated_at = now();

commit;
