# Los Alamos Tilcara MVP

## Phase 1. Architecture

### Product architecture

- Public web app for discovery, availability search, reservation requests, contact, SEO, and trust-building content.
- Protected admin app for reservation operations, occupancy review, guest tracking, inventory blocks, and lightweight content updates.
- Supabase as the operational backend for auth, PostgreSQL, optional storage, and future notifications.
- A development-only mock-data adapter keeps local scaffolding usable before the real Supabase project is fully provisioned.

### Route map

- `/` public landing and reservation flow
- `/admin/login` admin auth entry point
- `/admin/dashboard` metrics and recent reservations
- `/admin/reservations` reservation management table
- `/admin/guests` guest records
- `/admin/units` room and unit catalog
- `/admin/calendar` occupancy and block view
- `/admin/settings` lightweight content management
- `/admin/inquiries` inbound lead management
- `/api/availability` availability search endpoint
- `/api/reservation-requests/start` reservation request intake and OTP dispatch
- `/api/reservation-requests/verify` OTP validation endpoint
- `/api/reservation-requests/checkout` verified request checkout generation

### Data flow

1. The guest searches dates and guests on the landing page.
2. The availability endpoint validates input with Zod and filters units using overlap logic against confirmed reservations and manual blocks.
3. The guest sends a request-based reservation form.
4. The start endpoint validates the payload, snapshots pricing, creates a preliminary request, and sends an OTP to the guest email.
5. The guest validates the OTP and the checkout endpoint rechecks availability, creates the temporary hold, the reservation, and the Mercado Pago checkout.
6. The admin dashboard aggregates pending requests, occupancy, inquiries, and units for operational review.
7. In production, the app requires real Supabase configuration and should not rely on mock fallbacks.

## Phase 2. Supabase schema

- Main SQL migration: `supabase/schema.sql`
- Seed data: `supabase/seed.sql`

### Key relationships

- `profiles.id -> auth.users.id`
- `reservations.guest_id -> guests.id`
- `reservations.unit_id -> units.id`
- `unit_images.unit_id -> units.id`
- `unit_amenities.unit_id -> units.id`
- `unit_amenities.amenity_id -> amenities.id`
- `availability_blocks.unit_id -> units.id`
- `inquiries.unit_id -> units.id`

### RLS guidance

- Public users can read active catalog and marketing content.
- Public users can insert inquiries.
- Authenticated staff manage reservations, guests, blocks, and content.
- For stricter production security, replace the broad authenticated policies with role-aware checks against `profiles.role`.

## Phase 3. Application code

### Structure

```text
src/
  app/
    (public)/
    admin/
    api/
  components/
    admin/
    booking/
    layout/
    sections/
    ui/
  data/
  lib/
    availability/
    pricing/
    seo/
    supabase/
    utils/
    validations/
    whatsapp/
  types/
```

### Notable implementation choices

- The booking experience is intentionally request-based, not fake instant booking.
- Availability overlap uses the correct condition:
  `requested_check_in < existing_check_out AND requested_check_out > existing_check_in`
- Pricing snapshots are computed at request creation so future price edits do not retroactively alter historical reservations.
- Admin auth uses Supabase Auth and requires a matching `public.profiles` row with role `admin` or `staff`.

## Phase 4. Setup and deployment

### Environment variables

Copy `.env.example` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESERVATION_OTP_FROM_EMAIL`
- `RESERVATION_OTP_REPLY_TO_EMAIL`

### Local setup

1. Install dependencies with `npm install`.
2. Run `npm run dev`.
3. Create a Supabase project.
4. Apply `supabase/schema.sql`.
5. Apply `supabase/seed.sql`.
6. Run `supabase/migrations/006_production_auth_and_rls_hardening.sql`.
7. Run `supabase/migrations/007_reservation_request_otp_flow.sql`.
8. Create the first admin user in Supabase Auth and then run `supabase/scripts/production_admin_bootstrap.sql`.
9. Alternativamente, crea y confirma el admin de una sola vez con `npm run admin:create` usando `ADMIN_EMAIL`, `ADMIN_PASSWORD` y opcionalmente `ADMIN_FULL_NAME`.

### Admin bootstrap recomendado

Para evitar enlaces de confirmación con `localhost`, usar el script administrativo con service role:

```bash
ADMIN_EMAIL=losalamosjujuy@gmail.com ADMIN_PASSWORD="cambiar-por-password-segura" npm run admin:create
```

El script:

- crea el usuario en `auth.users` si no existe
- lo deja con `email_confirm: true`
- actualiza o crea `public.profiles` con rol `admin`

### Deployment notes

- Deploy on Vercel for native Next.js support.
- Add Supabase env vars in the Vercel project.
- Store gallery media in Supabase Storage and keep only signed or public URLs in `unit_images`.
- Configure a custom domain and update `src/lib/seo/metadata.ts` canonical URLs.

## Phase 5. Recommended next enhancements

- SMS or WhatsApp verification as an optional second factor.
- Reservation status mutations with audit trail persistence.
- Real admin forms for settings, units, blocks, and testimonials.
- Channel sync with Airbnb or Booking.com through a real availability source of truth.
- Automated email and WhatsApp notification pipelines.
- Spanish and English localization.
- Seasonal and weekend pricing engine.
- Reporting dashboard for occupancy, revenue, and lead sources.
