# Integraciones: Booking Engine, Mercado Pago y Google Hotel Center

## SQL a correr en Supabase
Ejecutar en este orden:

1. [supabase/migrations/001_initial_schema.sql](/C:/Users/cecil/proyectosAle/github/los-alamos-tilcara/supabase/migrations/001_initial_schema.sql)
2. [supabase/migrations/002_admin_extensions.sql](/C:/Users/cecil/proyectosAle/github/los-alamos-tilcara/supabase/migrations/002_admin_extensions.sql)
3. [supabase/migrations/004_booking_engine_payments_channels.sql](/C:/Users/cecil/proyectosAle/github/los-alamos-tilcara/supabase/migrations/004_booking_engine_payments_channels.sql)
4. [supabase/migrations/003_seed_data.sql](/C:/Users/cecil/proyectosAle/github/los-alamos-tilcara/supabase/migrations/003_seed_data.sql)

Si prefieres un esquema consolidado:

- [supabase/schema.sql](/C:/Users/cecil/proyectosAle/github/los-alamos-tilcara/supabase/schema.sql)
- [supabase/seed.sql](/C:/Users/cecil/proyectosAle/github/los-alamos-tilcara/supabase/seed.sql)

## Variables de entorno
Requeridas para la operacion real:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `MERCADO_PAGO_ACCESS_TOKEN`

Opcionales pero recomendadas:

- `MERCADO_PAGO_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESERVATION_OTP_FROM_EMAIL`
- `RESERVATION_OTP_REPLY_TO_EMAIL`
- `GOOGLE_HOTEL_CENTER_PARTNER_KEY`
- `GOOGLE_HOTEL_CENTER_HOTEL_ID`

## Flujo de reserva y cobro
1. La web crea una `reservation_request` en `pending_verification`.
2. El sistema envia un OTP por email y todavia no crea ni reserva ni pago.
3. El usuario valida el OTP con el endpoint de verificacion.
4. Recién en checkout se revalida disponibilidad, se crea el hold temporal, la reserva y la preferencia de `Mercado Pago Checkout Pro`.
5. El usuario es redirigido a Mercado Pago.
6. El `webhook` consulta el pago real contra la API de Mercado Pago.
7. Si el pago queda `approved`, la reserva pasa a `confirmed`.
8. Si queda `rejected`, `cancelled` o `expired`, la reserva pasa a `canceled` y el hold queda liberado.

Endpoints involucrados:

- `POST /api/reservation-requests/start`
- `POST /api/reservation-requests/verify`
- `POST /api/reservation-requests/checkout`
- `POST /api/reservation-requests/resend-otp`
- `POST /api/payments/mercadopago/webhook`
- `GET /reserva/estado`

## Google Hotel Center
Feeds implementados:

- `/api/channels/google-hotel-center/hotelList`
- `/api/channels/google-hotel-center/propertyData`
- `/api/channels/google-hotel-center/rates`
- `/api/channels/google-hotel-center/availability`
- `/api/channels/google-hotel-center/inventory`

Uso previsto:

1. Cargar la propiedad y hacer matching en Google Hotel Center.
2. Publicar el `hotelList`.
3. Publicar `propertyData` con rooms y rate plans.
4. Publicar `rates`, `availability` e `inventory` de forma programada.
5. Verificar exactitud de precios antes de activar `Free Booking Links`.

## Calendario y metricas reales
El calendario del admin ahora cruza:

- `reservations`
- `availability_blocks`
- `inventory`

Estados visuales:

- `confirmado`: reserva confirmada/completada/no-show
- `verificacion pendiente`: solicitud en `pending_verification`
- `pago pendiente`: reserva en `pending_payment` o `verified_pending_payment`
- `bloqueado`: bloqueo manual o `stop_sell` / inventario agotado
- `disponible`: sin conflictos

Metricas principales:

- ingresos: suma de `payments.status = approved`
- ocupacion: noches vendidas / unit-nights del mes
- pendientes: solicitudes `pending_verification` + reservas `pending_payment` + reservas `verified_pending_payment`

## Proximo paso recomendado
Antes de conectar Booking.com directo, conviene decidir:

- `channel manager externo` si quieren salir rapido a varios canales
- `integracion directa` solo si van a operar certificaciones y mantenimiento por canal
