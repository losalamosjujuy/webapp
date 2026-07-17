import {
  sendReservationAccessEmail,
  sendReservationOtpEmail,
  sendReservationStatusEmail
} from "@/lib/email/reservation-otp";
import { searchAvailableUnits } from "@/lib/availability/availability";
import { buildPricingSnapshot, buildStayQuote, getFromPricePerNight } from "@/lib/pricing/pricing";
import { createMercadoPagoPreference } from "@/lib/payments/mercadopago";
import {
  addMinutes,
  addSeconds,
  generateOtpCode,
  hashOtpCode,
  maskEmail,
  OTP_EXPIRATION_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  RESERVATION_HOLD_MINUTES,
  verifyOtpCode
} from "@/lib/reservations/otp";
import { canUseMockData, hasMercadoPagoEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { removeStorageObjects } from "@/lib/supabase/storage";
import { calculateNights } from "@/lib/utils/format";
import type { AdminInquiry, AdminState, AdminUser } from "@/types/admin";
import type {
  AdultPriceRate,
  Amenity,
  AvailabilityBlock,
  GalleryItem,
  InventoryRecord,
  Inquiry,
  LandingContent,
  Payment,
  RatePlan,
  PublicReservationLookup,
  ReservationHoldStatus,
  ReservationRequestStatus,
  Reservation,
  SiteSettings,
  Unit,
  UnitDetailItem,
  UnitImage
} from "@/types/domain";

const EMPTY_SITE_SETTINGS: SiteSettings = {
  whatsappNumber: "",
  phone: "",
  email: "",
  instagramUrl: "",
  facebookUrl: "",
  googleReviewsUrl: "",
  googleMapsUrl: "",
  address: "",
  city: "",
  region: "",
  depositPercentage: 10,
  coordinates: {
    lat: 0,
    lng: 0
  }
};

const EMPTY_LANDING_CONTENT: LandingContent = {
  hero: {
    eyebrow: "",
    title: "",
    subtitle: "",
    trustPoints: [],
    imageUrl: ""
  },
  about: "",
  policies: [],
  faqs: [],
  testimonials: []
};

type ReservationRequestRecord = {
  id: string;
  status: ReservationRequestStatus;
  fullName: string;
  phone: string;
  email: string;
  city?: string;
  country?: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  nights: number;
  adultsPriceRateId?: string;
  pricePerNight: number;
  subtotal: number;
  cleaningFee: number;
  totalAmount: number;
  depositPercentage: number;
  depositAmount: number;
  currency: string;
  specialNotes?: string;
  estimatedArrivalTime?: string;
  verifiedChannel?: "email";
  verificationExpiresAt?: string;
  verifiedAt?: string;
  reservationId?: string;
  createdAt: string;
  updatedAt: string;
};

type ContactVerificationRecord = {
  id: string;
  reservationRequestId: string;
  channel: "email";
  targetEmail: string;
  otpHash: string;
  expiresAt: string;
  attemptCount: number;
  verifiedAt?: string;
  lastSentAt: string;
  createdAt: string;
  updatedAt: string;
};

type ReservationHoldRecord = {
  id: string;
  reservationRequestId: string;
  reservationId?: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  status: ReservationHoldStatus;
  expiresAt: string;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type PublicReservationLookupRow = {
  id: string;
  reservation_code: string;
  status: Reservation["status"];
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  currency: string;
  guests: Array<{
    email: string;
  }> | null;
  units: Array<{
    name: string;
  }> | null;
};

type ReservationNotificationRow = {
  reservation_code: string;
  status: Reservation["status"];
  check_in: string;
  check_out: string;
  guests:
    | {
        full_name: string;
        email: string;
      }
    | Array<{
        full_name: string;
        email: string;
      }>
    | null;
  units:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null;
};

const PUBLIC_RESERVATION_LOOKUP_ERROR = "No pudimos validar una reserva con el codigo y el email ingresados.";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mockReservationRuntime = globalThis as typeof globalThis & {
  __mockReservationRequests?: ReservationRequestRecord[];
  __mockContactVerifications?: ContactVerificationRecord[];
  __mockReservationHolds?: ReservationHoldRecord[];
};

const mockReservationRequests = mockReservationRuntime.__mockReservationRequests ?? [];
const mockContactVerifications = mockReservationRuntime.__mockContactVerifications ?? [];
const mockReservationHolds = mockReservationRuntime.__mockReservationHolds ?? [];

mockReservationRuntime.__mockReservationRequests = mockReservationRequests;
mockReservationRuntime.__mockContactVerifications = mockContactVerifications;
mockReservationRuntime.__mockReservationHolds = mockReservationHolds;

function throwSupabaseDataError(scope: string, error: unknown): never {
  const message = extractSupabaseErrorMessage(error);

  if (
    scope === "units" &&
    (message.includes("highlights_json") || message.includes("details_json") || message.includes("42703"))
  ) {
    throw new Error(
      "Falta actualizar la tabla de unidades en Supabase. Corre la migracion supabase/migrations/008_units_rich_content.sql y vuelve a probar."
    );
  }

  throw new Error(`No pudimos cargar ${scope} desde Supabase.${message ? ` ${message}` : ""}`);
}

function extractSupabaseErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  };

  return [candidate.message, candidate.details, candidate.hint, candidate.code]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" | ");
}

function parseSupabaseNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const normalized =
      trimmed.includes(",") && trimmed.includes(".")
        ? trimmed.replace(/,/g, "")
        : trimmed.replace(",", ".");
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function isMissingAdultPriceRatesTable(error: unknown) {
  const message = extractSupabaseErrorMessage(error);
  return message.includes("adult_price_rates") && (message.includes("PGRST205") || message.includes("42P01"));
}

function isMissingProfilesStatusColumn(error: unknown) {
  const message = extractSupabaseErrorMessage(error);
  return message.includes("profiles") && message.includes("status") && (message.includes("42703") || message.includes("PGRST204"));
}

function assertRealDataMode(scope: string) {
  if (canUseMockData()) {
    throw new Error(`Supabase real no esta disponible para ${scope}. Configura las credenciales reales antes de continuar.`);
  }
}

function mapUnitImage(row: any): UnitImage {
  return {
    id: row.id,
    imageUrl: row.image_url,
    altText: row.alt_text,
    sortOrder: row.sort_order,
    storagePath: row.storage_path ?? undefined
  };
}

function mapAmenity(row: any): Amenity {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    category: row.category
  };
}

function mapAdultPriceRate(row: any): AdultPriceRate {
  return {
    id: row.id,
    unitId: row.unit_id,
    adults: row.adults,
    pricePerNight: parseSupabaseNumber(row.price_per_night ?? row.pricePerNight),
    active: row.active,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

function mapUnit(row: any): Unit {
  const images = (row.unit_images ?? [])
    .map(mapUnitImage)
    .sort((a: UnitImage, b: UnitImage) => a.sortOrder - b.sortOrder);
  const amenities = (row.unit_amenities ?? [])
    .map((item: any) => item.amenities)
    .filter(Boolean)
    .map(mapAmenity);
  const adultPriceRates = (row.adult_price_rates ?? [])
    .map(mapAdultPriceRate)
    .sort((a: AdultPriceRate, b: AdultPriceRate) => a.adults - b.adults);
  const basePricePerNight = parseSupabaseNumber(row.base_price_per_night ?? row.basePricePerNight);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description ?? "",
    maxGuests: row.max_guests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: parseSupabaseNumber(row.bathrooms),
    basePricePerNight: basePricePerNight,
    fromPricePerNight: getFromPricePerNight({
      adultPriceRates,
      basePricePerNight
    }),
    cleaningFee: parseSupabaseNumber(row.cleaning_fee ?? row.cleaningFee),
    active: row.active,
    featuredImage: images[0]?.imageUrl ?? "",
    amenities,
    images,
    adultPriceRates,
    highlights: Array.isArray(row.highlights_json)
      ? row.highlights_json.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
    details: Array.isArray(row.details_json)
      ? row.details_json
          .filter(
            (item: unknown): item is UnitDetailItem =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof (item as UnitDetailItem).label === "string" &&
              typeof (item as UnitDetailItem).value === "string"
          )
          .map((item: UnitDetailItem) => ({
            label: item.label.trim(),
            value: item.value.trim()
          }))
          .filter((item: UnitDetailItem) => item.label && item.value)
      : []
  };
}

function normalizeStringList(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeUnitDetails(items: UnitDetailItem[]) {
  return items
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim()
    }))
    .filter((item) => item.label && item.value);
}

function mapReservation(row: any): Reservation {
  return {
    id: row.id,
    reservationCode: row.reservation_code,
    guest: {
      id: row.guests.id,
      fullName: row.guests.full_name,
      phone: row.guests.phone,
      email: row.guests.email,
      city: row.guests.city ?? undefined,
      country: row.guests.country ?? undefined,
      notes: row.guests.notes ?? undefined
    },
    unit: {
      id: row.units.id,
      name: row.units.name,
      slug: row.units.slug
    },
    source: row.source,
    status: row.status,
    checkIn: row.check_in,
    checkOut: row.check_out,
    adults: row.adults,
    children: row.children,
    nights: row.nights,
    adultsPriceRateId: row.adults_price_rate_id ?? undefined,
    pricePerNight: parseSupabaseNumber(row.price_per_night ?? row.pricePerNight),
    subtotal: parseSupabaseNumber(row.subtotal),
    cleaningFee: parseSupabaseNumber(row.cleaning_fee ?? row.cleaningFee),
    totalAmount: parseSupabaseNumber(row.total_amount),
    depositPercentage: parseSupabaseNumber(row.deposit_percentage ?? row.depositPercentage),
    depositAmount: parseSupabaseNumber(row.deposit_amount ?? row.depositAmount),
    currency: row.currency,
    specialRequests: row.special_requests ?? undefined,
    estimatedArrivalTime: row.estimated_arrival_time ?? undefined,
    adminNotes: row.admin_notes ?? undefined,
    createdAt: row.created_at
  };
}

function mapAvailabilityBlock(row: any): AvailabilityBlock {
  return {
    id: row.id,
    unitId: row.unit_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    blockType: row.block_type
  };
}

function mapRatePlan(row: any): RatePlan {
  return {
    id: row.id,
    unitId: row.unit_id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    currency: row.currency,
    pricingMode: row.pricing_mode,
    basePricePerNight: parseSupabaseNumber(row.base_price_per_night ?? row.basePricePerNight),
    isDefault: row.is_default,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapInventoryRecord(row: any): InventoryRecord {
  return {
    id: row.id,
    unitId: row.unit_id,
    ratePlanId: row.rate_plan_id ?? undefined,
    date: row.date,
    availableUnits: row.available_units,
    stopSell: row.stop_sell,
    closedToArrival: row.closed_to_arrival,
    closedToDeparture: row.closed_to_departure,
    minStay: row.min_stay ?? undefined,
    maxStay: row.max_stay ?? undefined,
    baseRate: row.base_rate === null || row.base_rate === undefined ? undefined : parseSupabaseNumber(row.base_rate),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPayment(row: any): Payment {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    provider: row.provider,
    status: row.status,
    amount: parseSupabaseNumber(row.amount),
    currency: row.currency,
    externalReference: row.external_reference,
    checkoutUrl: row.checkout_url ?? undefined,
    providerPreferenceId: row.provider_preference_id ?? undefined,
    providerPaymentId: row.provider_payment_id ?? undefined,
    providerMerchantOrderId: row.provider_merchant_order_id ?? undefined,
    paidAt: row.paid_at ?? undefined,
    rawPayload: row.raw_payload ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPublicReservationLookup(
  row: PublicReservationLookupRow,
  payment?: Pick<Payment, "status" | "checkoutUrl"> | null
): PublicReservationLookup {
  return {
    reservationCode: row.reservation_code,
    status: row.status,
    paymentStatus: payment?.status,
    checkoutUrl: payment?.checkoutUrl,
    unitName: row.units?.[0]?.name ?? "Alojamiento",
    checkIn: row.check_in,
    checkOut: row.check_out,
    adults: row.adults,
    children: row.children,
    totalAmount: parseSupabaseNumber(row.total_amount),
    currency: row.currency
  };
}

async function notifyReservationStatusUpdate(reservationId: string, paymentStatus: Payment["status"], checkoutUrl?: string | null) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(`
      reservation_code,
      status,
      check_in,
      check_out,
      guests (
        full_name,
        email
      ),
      units (
        name
      )
    `)
    .eq("id", reservationId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Unable to load reservation notification data.");
  }

  const reservation = data as unknown as ReservationNotificationRow;
  const guest = Array.isArray(reservation.guests) ? reservation.guests[0] : reservation.guests;
  const unit = Array.isArray(reservation.units) ? reservation.units[0] : reservation.units;

  if (!guest?.email) {
    return;
  }

  await sendReservationStatusEmail({
    to: guest.email,
    fullName: guest.full_name,
    reservationCode: reservation.reservation_code,
    unitName: unit?.name ?? "Alojamiento",
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    reservationStatus: reservation.status,
    paymentStatus,
    checkoutUrl
  });
}

function mapInquiry(row: any): Inquiry {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    checkIn: row.check_in ?? undefined,
    checkOut: row.check_out ?? undefined,
    guestsCount: row.guests_count ?? undefined,
    unitId: row.unit_id ?? undefined,
    source: row.source,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapReservationRequest(row: any): ReservationRequestRecord {
  return {
    id: row.id,
    status: row.status,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    unitId: row.unit_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    adults: row.adults,
    children: row.children,
    nights: row.nights,
    adultsPriceRateId: row.adults_price_rate_id ?? undefined,
    pricePerNight: parseSupabaseNumber(row.price_per_night ?? row.pricePerNight),
    subtotal: parseSupabaseNumber(row.subtotal),
    cleaningFee: parseSupabaseNumber(row.cleaning_fee ?? row.cleaningFee),
    totalAmount: parseSupabaseNumber(row.total_amount ?? row.totalAmount),
    depositPercentage: parseSupabaseNumber(row.deposit_percentage ?? row.depositPercentage),
    depositAmount: parseSupabaseNumber(row.deposit_amount ?? row.depositAmount),
    currency: row.currency,
    specialNotes: row.special_notes ?? undefined,
    estimatedArrivalTime: row.estimated_arrival_time ?? undefined,
    verifiedChannel: row.verified_channel ?? undefined,
    verificationExpiresAt: row.verification_expires_at ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    reservationId: row.reservation_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapContactVerification(row: any): ContactVerificationRecord {
  return {
    id: row.id,
    reservationRequestId: row.reservation_request_id,
    channel: row.channel,
    targetEmail: row.target_email,
    otpHash: row.otp_hash,
    expiresAt: row.expires_at,
    attemptCount: row.attempt_count,
    verifiedAt: row.verified_at ?? undefined,
    lastSentAt: row.last_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReservationHold(row: any): ReservationHoldRecord {
  return {
    id: row.id,
    reservationRequestId: row.reservation_request_id,
    reservationId: row.reservation_id ?? undefined,
    unitId: row.unit_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status,
    expiresAt: row.expires_at,
    releasedAt: row.released_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function fetchSiteSettings(): Promise<SiteSettings> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value_json");

  if (error || !data) {
    return EMPTY_SITE_SETTINGS;
  }

  const byKey = Object.fromEntries(data.map((item) => [item.key, item.value_json ?? {}]));
  const contact = byKey.contact ?? {};
  const location = byKey.location ?? {};
  const reviews = byKey.reviews ?? {};
  const general = byKey.general ?? {};

  return {
    whatsappNumber: contact.whatsappNumber ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    instagramUrl: contact.instagramUrl ?? "",
    facebookUrl: contact.facebookUrl ?? "",
    googleReviewsUrl: reviews.googleReviewsUrl ?? "",
    googleMapsUrl: reviews.googleMapsUrl ?? location.googleMapsUrl ?? "",
    address: location.address ?? "",
    city: location.city ?? "",
    region: location.region ?? "",
    depositPercentage: parseSupabaseNumber(general.depositPercentage, EMPTY_SITE_SETTINGS.depositPercentage),
    coordinates: location.coordinates ?? EMPTY_SITE_SETTINGS.coordinates
  };
}

async function fetchLandingContent(): Promise<LandingContent> {
  const supabase = createSupabaseServiceClient();
  const [{ data: contentRows }, { data: faqRows }, { data: testimonialRows }] = await Promise.all([
    supabase.from("pages_content").select("section, content_json").eq("page", "home"),
    supabase
      .from("faqs")
      .select("id, question, answer, sort_order, active")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("testimonials")
      .select("id, guest_name, quote, rating, source, active, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
  ]);

  const sectionMap = Object.fromEntries((contentRows ?? []).map((row) => [row.section, row.content_json ?? {}]));

  return {
    hero: {
      eyebrow: sectionMap.hero?.eyebrow ?? "",
      title: sectionMap.hero?.title ?? "",
      subtitle: sectionMap.hero?.subtitle ?? "",
      trustPoints: sectionMap.hero?.trustPoints ?? [],
      imageUrl: sectionMap.hero?.image ?? ""
    },
    about: sectionMap.about?.body ?? "",
    policies: sectionMap.policies?.items ?? [],
    faqs:
      faqRows?.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer
      })) ?? EMPTY_LANDING_CONTENT.faqs,
    testimonials:
      testimonialRows?.map((testimonial) => ({
        id: testimonial.id,
        guestName: testimonial.guest_name,
        quote: testimonial.quote,
        rating: testimonial.rating,
        source: testimonial.source ?? "web",
        active: testimonial.active
      })) ?? EMPTY_LANDING_CONTENT.testimonials
  };
}

async function fetchPublicFaqs() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("faqs")
    .select("id, question, answer, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return null;
  }

  return data.map((faq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer
  }));
}

async function fetchGalleryItems() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("id, title, category, image_url, storage_path")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [] as GalleryItem[];
  }

  return data.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    imageUrl: item.image_url,
    storagePath: item.storage_path ?? undefined
  }));
}

async function fetchUnits({ activeOnly = false }: { activeOnly?: boolean } = {}) {
  const supabase = createSupabaseServiceClient();
  let query = supabase.from("units").select(`
      id,
      name,
      slug,
      short_description,
      description,
      max_guests,
      bedrooms,
      beds,
      bathrooms,
      base_price_per_night,
      cleaning_fee,
      highlights_json,
      details_json,
      active,
      unit_images (
        id,
        image_url,
        alt_text,
        sort_order,
        storage_path
      ),
      unit_amenities (
        amenities (
          id,
          name,
          icon,
          category
        )
      )
    `);

  if (activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error || !data) {
    throwSupabaseDataError("units", error);
  }

  const unitIds = data.map((unit) => unit.id);
  const { data: adultRateRows, error: adultRateRowsError } = await supabase
    .from("adult_price_rates")
    .select("id, unit_id, adults, price_per_night, active, created_at, updated_at")
    .in("unit_id", unitIds)
    .order("adults", { ascending: true });

  if (adultRateRowsError && !isMissingAdultPriceRatesTable(adultRateRowsError)) {
    throwSupabaseDataError("tarifas por adultos", adultRateRowsError);
  }

  const adultRatesByUnitId = new Map<string, AdultPriceRate[]>();

  for (const row of adultRateRows ?? []) {
    const current = adultRatesByUnitId.get(row.unit_id) ?? [];
    current.push(mapAdultPriceRate(row));
    adultRatesByUnitId.set(row.unit_id, current);
  }

  return data.map((row) => mapUnit({
    ...row,
    adult_price_rates: adultRatesByUnitId.get(row.id) ?? (
      isMissingAdultPriceRatesTable(adultRateRowsError)
        ? Array.from({ length: row.max_guests }, (_, index) => ({
            id: `${row.id}-fallback-rate-${index + 1}`,
            unit_id: row.id,
            adults: index + 1,
            price_per_night: row.base_price_per_night,
            active: true
          }))
        : []
    )
  }));
}

async function fetchReservations() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(`
      id,
      reservation_code,
      source,
      status,
      check_in,
      check_out,
      adults,
      children,
      nights,
      adults_price_rate_id,
      price_per_night,
      subtotal,
      cleaning_fee,
      total_amount,
      deposit_percentage,
      deposit_amount,
      currency,
      special_requests,
      estimated_arrival_time,
      admin_notes,
      created_at,
      guests (
        id,
        full_name,
        phone,
        email,
        city,
        country,
        notes
      ),
      units (
        id,
        name,
        slug
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !data) {
    throwSupabaseDataError("reservas", error);
  }

  return data.map(mapReservation);
}

async function fetchRatePlans({ activeOnly = false }: { activeOnly?: boolean } = {}) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("rate_plans")
    .select("id, unit_id, code, name, description, currency, pricing_mode, base_price_per_night, is_default, active, created_at, updated_at");

  if (activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.order("is_default", { ascending: false });

  if (error || !data) {
    return [] as RatePlan[];
  }

  return data.map(mapRatePlan);
}

async function fetchInventory({
  startDate,
  endDate,
  unitIds
}: {
  startDate?: string;
  endDate?: string;
  unitIds?: string[];
} = {}) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("inventory")
    .select("id, unit_id, rate_plan_id, date, available_units, stop_sell, closed_to_arrival, closed_to_departure, min_stay, max_stay, base_rate, source, created_at, updated_at");

  if (startDate) {
    query = query.gte("date", startDate);
  }

  if (endDate) {
    query = query.lte("date", endDate);
  }

  if (unitIds?.length) {
    query = query.in("unit_id", unitIds);
  }

  const { data, error } = await query.order("date", { ascending: true });

  if (error || !data) {
    return [] as InventoryRecord[];
  }

  return data.map(mapInventoryRecord);
}

async function fetchPayments() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, reservation_id, provider, status, amount, currency, external_reference, checkout_url, provider_preference_id, provider_payment_id, provider_merchant_order_id, paid_at, raw_payload, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [] as Payment[];
  }

  return data.map(mapPayment);
}

async function fetchAvailabilityBlocks() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("availability_blocks")
    .select("id, unit_id, start_date, end_date, reason, block_type")
    .order("start_date", { ascending: true });

  if (error || !data) {
    throwSupabaseDataError("bloqueos de disponibilidad", error);
  }

  return data.map(mapAvailabilityBlock);
}

async function fetchReservationRequests() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("reservation_requests")
    .select("id, status, full_name, phone, email, city, country, unit_id, check_in, check_out, adults, children, nights, adults_price_rate_id, price_per_night, subtotal, cleaning_fee, total_amount, deposit_percentage, deposit_amount, currency, special_notes, estimated_arrival_time, verified_channel, verification_expires_at, verified_at, reservation_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    throwSupabaseDataError("solicitudes de reserva", error);
  }

  return data.map(mapReservationRequest);
}

async function fetchContactVerificationByRequestId(reservationRequestId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("contact_verifications")
    .select("id, reservation_request_id, channel, target_email, otp_hash, expires_at, attempt_count, verified_at, last_sent_at, created_at, updated_at")
    .eq("reservation_request_id", reservationRequestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      throwSupabaseDataError("verificaciones de contacto", error);
    }

    return null;
  }

  return mapContactVerification(data);
}

async function fetchActiveReservationHolds() {
  const now = new Date().toISOString();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("reservation_holds")
    .select("id, reservation_request_id, reservation_id, unit_id, check_in, check_out, status, expires_at, released_at, created_at, updated_at")
    .eq("status", "active")
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  if (error || !data) {
    throwSupabaseDataError("holds de reserva", error);
  }

  return data.map(mapReservationHold);
}

async function fetchReservationRequestById(id: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("reservation_requests")
    .select("id, status, full_name, phone, email, city, country, unit_id, check_in, check_out, adults, children, nights, adults_price_rate_id, price_per_night, subtotal, cleaning_fee, total_amount, deposit_percentage, deposit_amount, currency, special_notes, estimated_arrival_time, verified_channel, verification_expires_at, verified_at, reservation_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      throwSupabaseDataError("solicitudes de reserva", error);
    }

    return null;
  }

  return mapReservationRequest(data);
}

function reservationHoldToBlock(hold: ReservationHoldRecord): AvailabilityBlock {
  return {
    id: hold.id,
    unitId: hold.unitId,
    startDate: hold.checkIn,
    endDate: hold.checkOut,
    reason: "Reserva en proceso",
    blockType: "manual_hold"
  };
}

async function fetchInquiries() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("id, full_name, phone, email, message, check_in, check_out, guests_count, unit_id, source, status, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    throwSupabaseDataError("consultas", error);
  }

  return data.map(mapInquiry);
}

async function fetchAdminProfiles() {
  const supabase = createSupabaseServiceClient();
  const profilesWithStatus = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, created_at")
    .order("created_at", { ascending: true });

  if (!profilesWithStatus.error && profilesWithStatus.data) {
    return profilesWithStatus.data;
  }

  if (!isMissingProfilesStatusColumn(profilesWithStatus.error)) {
    throw profilesWithStatus.error;
  }

  const profilesWithoutStatus = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: true });

  if (profilesWithoutStatus.error || !profilesWithoutStatus.data) {
    throw profilesWithoutStatus.error ?? new Error("No pudimos cargar los perfiles administrativos.");
  }

  return profilesWithoutStatus.data.map((profile) => ({
    ...profile,
    status: "active"
  }));
}

async function updateAdminProfileRecord(params: {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "staff";
  status: AdminUser["status"];
}) {
  const supabase = createSupabaseServiceClient();
  const profileWithStatus = await supabase
    .from("profiles")
    .update({
      email: params.email,
      full_name: params.fullName,
      role: params.role,
      status: params.status
    })
    .eq("id", params.id)
    .select("id, email, full_name, role, status, created_at")
    .single();

  if (!profileWithStatus.error && profileWithStatus.data) {
    return profileWithStatus.data;
  }

  if (!isMissingProfilesStatusColumn(profileWithStatus.error)) {
    throw profileWithStatus.error ?? new Error("No pudimos guardar el perfil del usuario.");
  }

  const profileWithoutStatus = await supabase
    .from("profiles")
    .update({
      email: params.email,
      full_name: params.fullName,
      role: params.role
    })
    .eq("id", params.id)
    .select("id, email, full_name, role, created_at")
    .single();

  if (profileWithoutStatus.error || !profileWithoutStatus.data) {
    throw profileWithoutStatus.error ?? new Error("No pudimos guardar el perfil del usuario.");
  }

  return {
    ...profileWithoutStatus.data,
    status: "active"
  };
}

function getDefaultRatePlan(unit: Unit, ratePlans: RatePlan[]) {
  return (
    ratePlans.find((plan) => plan.unitId === unit.id && plan.isDefault && plan.active) ??
    ratePlans.find((plan) => plan.unitId === unit.id && plan.active)
  );
}

function quoteReservationStay({
  checkIn,
  checkOut,
  unit,
  adults,
  children,
  depositPercentage
}: {
  checkIn: string;
  checkOut: string;
  unit: Unit;
  adults: number;
  children?: number;
  depositPercentage: number;
}) {
  return {
    ...buildStayQuote({
      unit,
      checkIn,
      checkOut,
      adults,
      children,
      depositPercentage
    }),
    currency: "ARS",
    ratePlan: getDefaultRatePlan(unit, [])
  };
}

function toFiniteNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeResolvedPricing<T extends {
  nights?: unknown;
  pricePerNight?: unknown;
  basePricePerNight?: unknown;
  cleaningFee?: unknown;
  subtotal?: unknown;
  total?: unknown;
  totalAmount?: unknown;
  depositPercentage?: unknown;
  depositAmount?: unknown;
  currency?: unknown;
}>(pricing: T) {
  const nights = toFiniteNumberOrNull(pricing.nights);
  const pricePerNight = toFiniteNumberOrNull(pricing.pricePerNight ?? pricing.basePricePerNight);
  const cleaningFee = toFiniteNumberOrNull(pricing.cleaningFee) ?? 0;
  const subtotal = toFiniteNumberOrNull(pricing.subtotal);
  const total = toFiniteNumberOrNull(pricing.total ?? pricing.totalAmount);
  const depositPercentage =
    toFiniteNumberOrNull(pricing.depositPercentage) ?? EMPTY_SITE_SETTINGS.depositPercentage;
  const depositAmount = toFiniteNumberOrNull(pricing.depositAmount);

  if (!nights || pricePerNight === null) {
    throw new Error("No pudimos calcular el precio de la estadia. Revisa las fechas y la tarifa del alojamiento.");
  }

  const normalizedSubtotal = subtotal ?? nights * pricePerNight;
  const normalizedTotal = total ?? normalizedSubtotal + cleaningFee;
  const normalizedDepositAmount =
    depositAmount ?? Math.ceil((normalizedTotal * depositPercentage) / 100);

  return {
    ...pricing,
    nights,
    pricePerNight,
    basePricePerNight: pricePerNight,
    cleaningFee,
    subtotal: normalizedSubtotal,
    total: normalizedTotal,
    totalAmount: normalizedTotal,
    depositPercentage,
    depositAmount: normalizedDepositAmount,
    currency: typeof pricing.currency === "string" && pricing.currency ? pricing.currency : "ARS"
  };
}

async function prepareReservationQuote(payload: {
  fullName: string;
  phone: string;
  email: string;
  city?: string;
  country?: string;
  adults: number;
  children?: number;
  unitId?: string;
  checkIn: string;
  checkOut: string;
  specialNotes?: string;
  estimatedArrivalTime?: string;
}) {
  if (payload.unitId && !UUID_PATTERN.test(payload.unitId)) {
    throw new Error("La unidad seleccionada no es valida. Volve a elegir el alojamiento antes de continuar.");
  }

  const [units, siteSettings] = await Promise.all([
    fetchUnits({ activeOnly: true }),
    fetchSiteSettings()
  ]);
  const selectedUnit = payload.unitId
    ? units.find((unit) => unit.id === payload.unitId)
    : units[0];

  if (!selectedUnit) {
    throw new Error(
      payload.unitId
        ? "La unidad seleccionada ya no esta disponible. Volve a elegir el alojamiento antes de continuar."
        : "No hay unidades disponibles para esas fechas."
    );
  }

  if (!UUID_PATTERN.test(selectedUnit.id)) {
    throw new Error("No pudimos validar la unidad seleccionada. Recarga la pagina e intenta nuevamente.");
  }

  const activeHolds = await fetchActiveReservationHolds();
  const mergedBlocks = [...(await fetchAvailabilityBlocks()), ...activeHolds.map(reservationHoldToBlock)];
  const availableUnits = searchAvailableUnits({
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    guests: payload.adults,
    units: [selectedUnit],
    reservations: await fetchReservations(),
    blocks: mergedBlocks
  });

  if (!availableUnits.some((unit) => unit.id === selectedUnit.id)) {
    throw new Error("La unidad seleccionada ya no está disponible para esas fechas.");
  }

  const pricing = quoteReservationStay({
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    unit: selectedUnit,
    adults: payload.adults,
    children: payload.children,
    depositPercentage: siteSettings.depositPercentage
  });

  return {
    unit: selectedUnit,
    pricing: normalizeResolvedPricing(pricing)
  };
}

export async function getLandingPageData() {
  assertRealDataMode("la landing publica");

  const [units, siteSettings, landingContent, gallery] = await Promise.all([
    fetchUnits({ activeOnly: true }),
    fetchSiteSettings(),
    fetchLandingContent(),
    fetchGalleryItems()
  ]);

  return {
    units,
    siteSettings,
    landingContent,
    gallery
  };
}

export async function getDashboardData() {
  assertRealDataMode("el dashboard");

  const [reservations, blocks, inquiries, units] = await Promise.all([
    fetchReservations(),
    fetchAvailabilityBlocks(),
    fetchInquiries(),
    fetchUnits()
  ]);

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const reservationsThisMonth = reservations.filter(
    (reservation) => new Date(reservation.createdAt) >= startOfMonth
  );
  const pendingRequests = reservations.filter((reservation) => reservation.status === "pending");
  const upcomingConfirmed = reservations.filter(
    (reservation) =>
      reservation.status === "confirmed" && new Date(reservation.checkIn) >= now
  );

  return {
    metrics: {
      reservationsThisMonth: reservationsThisMonth.length,
      pendingRequests: pendingRequests.length,
      upcomingConfirmed: upcomingConfirmed.length,
      occupancyPercentage: 64,
      blockedDates: blocks.length,
      recentInquiries: inquiries.length
    },
    reservations,
    blocks,
    inquiries,
    units
  };
}

export async function searchUnits({
  checkIn,
  checkOut,
  guests,
  unitId
}: {
  checkIn: string;
  checkOut: string;
  guests: number;
  unitId?: string;
}) {
  assertRealDataMode("la busqueda de disponibilidad");

  const [units, reservations, blocks, inventory, holds] = await Promise.all([
    fetchUnits({ activeOnly: true }),
    fetchReservations(),
    fetchAvailabilityBlocks(),
    fetchInventory({ startDate: checkIn, endDate: checkOut }),
    fetchActiveReservationHolds()
  ]);

  const pool = unitId ? units.filter((unit) => unit.id === unitId) : units;
  const mergedBlocks = [...blocks, ...holds.map(reservationHoldToBlock)];

  const availableByReservations = searchAvailableUnits({
    checkIn,
    checkOut,
    guests,
    units: pool,
    reservations,
    blocks: mergedBlocks
  });

  return availableByReservations.filter((unit) => {
    const records = inventory.filter((item) => item.unitId === unit.id && item.date >= checkIn && item.date < checkOut);

    if (!records.length) {
      return true;
    }

    return records.every(
      (record) =>
        !record.stopSell &&
        record.availableUnits > 0 &&
        (!record.minStay || calculateNights(checkIn, checkOut) >= record.minStay) &&
        (!record.maxStay || calculateNights(checkIn, checkOut) <= record.maxStay)
    );
  });
}

export async function startReservationRequestVerification(payload: {
  fullName: string;
  phone: string;
  email: string;
  city?: string;
  country?: string;
  adults: number;
  children?: number;
  unitId?: string;
  checkIn: string;
  checkOut: string;
  specialNotes?: string;
  estimatedArrivalTime?: string;
}) {
  assertRealDataMode("el inicio de la reserva");

  const now = new Date();
  const verificationExpiresAt = addMinutes(now, OTP_EXPIRATION_MINUTES).toISOString();
  const resendAvailableAt = addSeconds(now, OTP_RESEND_COOLDOWN_SECONDS).toISOString();
  const code = generateOtpCode();
  const otpHash = hashOtpCode(code);
  const { unit, pricing } = await prepareReservationQuote(payload);

  const supabase = createSupabaseServiceClient();
  const { data: requestRow, error: requestError } = await supabase
    .from("reservation_requests")
    .insert({
      status: "pending_verification",
      full_name: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      city: payload.city ?? null,
      country: payload.country ?? null,
      unit_id: unit.id,
      check_in: payload.checkIn,
      check_out: payload.checkOut,
      adults: payload.adults,
      children: payload.children ?? 0,
      nights: pricing.nights,
      adults_price_rate_id: pricing.adultsPriceRateId,
      price_per_night: pricing.pricePerNight,
      subtotal: pricing.subtotal,
      cleaning_fee: pricing.cleaningFee,
      total_amount: pricing.total,
      deposit_percentage: pricing.depositPercentage,
      deposit_amount: pricing.depositAmount,
      currency: pricing.currency,
      special_notes: payload.specialNotes ?? null,
      estimated_arrival_time: payload.estimatedArrivalTime ?? null,
      verification_expires_at: verificationExpiresAt
    })
    .select("id")
    .single();

  if (requestError || !requestRow) {
    throw requestError ?? new Error("No pudimos iniciar la solicitud de reserva.");
  }

  const { error: verificationError } = await supabase
    .from("contact_verifications")
    .insert({
      reservation_request_id: requestRow.id,
      channel: "email",
      target_email: payload.email,
      otp_hash: otpHash,
      expires_at: verificationExpiresAt,
      last_sent_at: now.toISOString()
    });

  if (verificationError) {
    throw verificationError;
  }

  await sendReservationOtpEmail({
    to: payload.email,
    fullName: payload.fullName,
    code,
    unitName: unit.name,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    expiresInMinutes: OTP_EXPIRATION_MINUTES
  });

  return {
    requestId: requestRow.id,
    maskedEmail: maskEmail(payload.email),
    expiresAt: verificationExpiresAt,
    resendAvailableAt
  };
}

export async function verifyReservationRequestCode(payload: {
  requestId: string;
  code: string;
}) {
  assertRealDataMode("la validacion del codigo OTP");

  const now = new Date();
  const request = await fetchReservationRequestById(payload.requestId);

  if (!request) {
    throw new Error("Solicitud no encontrada.");
  }

  if (request.status === "checkout_created" || request.status === "completed") {
    return {
      requestId: request.id,
      verified: true
    };
  }

  const verification = await fetchContactVerificationByRequestId(request.id);

  if (!verification) {
    throw new Error("No encontramos una verificación pendiente para esta solicitud.");
  }

  if (verification.verifiedAt) {
    return {
      requestId: request.id,
      verified: true
    };
  }

  if (verification.expiresAt <= now.toISOString()) {
    await markReservationRequestVerificationExpired(request.id);
    throw new Error("El código venció. Solicita uno nuevo para continuar.");
  }

  if (!verifyOtpCode(payload.code, verification.otpHash)) {
    const nextAttempts = verification.attemptCount + 1;
    const shouldExpire = nextAttempts >= OTP_MAX_ATTEMPTS;
    await updateVerificationAttempts(request.id, nextAttempts, shouldExpire);
    throw new Error(
      shouldExpire
        ? "Superaste la cantidad máxima de intentos. Solicita un código nuevo."
        : "El código ingresado no es válido."
    );
  }

  if (canUseMockData()) {
    const verificationIndex = mockContactVerifications.findIndex((item) => item.id === verification.id);
    const requestIndex = mockReservationRequests.findIndex((item) => item.id === request.id);

    if (verificationIndex >= 0) {
      mockContactVerifications[verificationIndex] = {
        ...mockContactVerifications[verificationIndex],
        verifiedAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
    }

    if (requestIndex >= 0) {
      mockReservationRequests[requestIndex] = {
        ...mockReservationRequests[requestIndex],
        status: "verified",
        verifiedChannel: "email",
        verifiedAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
    }
  } else {
    const supabase = createSupabaseServiceClient();
    const [{ error: verificationError }, { error: requestError }] = await Promise.all([
      supabase
        .from("contact_verifications")
        .update({
          verified_at: now.toISOString()
        })
        .eq("id", verification.id),
      supabase
        .from("reservation_requests")
        .update({
          status: "verified",
          verified_channel: "email",
          verified_at: now.toISOString()
        })
        .eq("id", request.id)
    ]);

    if (verificationError || requestError) {
      throw verificationError ?? requestError ?? new Error("No pudimos validar el código.");
    }
  }

  return {
    requestId: request.id,
    verified: true
  };
}

export async function resendReservationRequestCode(payload: { requestId: string }) {
  assertRealDataMode("el reenvio del codigo OTP");

  const now = new Date();
  const request = await fetchReservationRequestById(payload.requestId);

  if (!request) {
    throw new Error("Solicitud no encontrada.");
  }

  if (request.verifiedAt || request.status === "verified" || request.status === "checkout_created" || request.status === "completed") {
    throw new Error("La solicitud ya fue verificada.");
  }

  const verification = await fetchContactVerificationByRequestId(request.id);

  if (verification && addSeconds(new Date(verification.lastSentAt), OTP_RESEND_COOLDOWN_SECONDS) > now) {
    throw new Error("Espera un minuto antes de solicitar un nuevo código.");
  }

  const code = generateOtpCode();
  const expiresAt = addMinutes(now, OTP_EXPIRATION_MINUTES).toISOString();
  const resendAvailableAt = addSeconds(now, OTP_RESEND_COOLDOWN_SECONDS).toISOString();
  const unit = (await fetchUnits({ activeOnly: false })).find((item) => item.id === request.unitId);

  if (!unit) {
    throw new Error("La unidad seleccionada ya no existe.");
  }

  if (canUseMockData()) {
    if (verification) {
      const verificationIndex = mockContactVerifications.findIndex((item) => item.id === verification.id);

      if (verificationIndex >= 0) {
        mockContactVerifications[verificationIndex] = {
          ...mockContactVerifications[verificationIndex],
          otpHash: hashOtpCode(code),
          expiresAt,
          attemptCount: 0,
          verifiedAt: undefined,
          lastSentAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
      }
    } else {
      mockContactVerifications.unshift({
        id: crypto.randomUUID(),
        reservationRequestId: request.id,
        channel: "email",
        targetEmail: request.email,
        otpHash: hashOtpCode(code),
        expiresAt,
        attemptCount: 0,
        lastSentAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
    }

    const requestIndex = mockReservationRequests.findIndex((item) => item.id === request.id);

    if (requestIndex >= 0) {
      mockReservationRequests[requestIndex] = {
        ...mockReservationRequests[requestIndex],
        status: "pending_verification",
        verificationExpiresAt: expiresAt,
        updatedAt: now.toISOString()
      };
    }
  } else {
    const supabase = createSupabaseServiceClient();
    const verificationPayload = {
      otp_hash: hashOtpCode(code),
      expires_at: expiresAt,
      attempt_count: 0,
      verified_at: null,
      last_sent_at: now.toISOString()
    };

    const verificationMutation = verification
      ? supabase.from("contact_verifications").update(verificationPayload).eq("id", verification.id)
      : supabase.from("contact_verifications").insert({
          reservation_request_id: request.id,
          channel: "email",
          target_email: request.email,
          ...verificationPayload
        });

    const [{ error: verificationError }, { error: requestError }] = await Promise.all([
      verificationMutation,
      supabase
        .from("reservation_requests")
        .update({
          status: "pending_verification",
          verification_expires_at: expiresAt
        })
        .eq("id", request.id)
    ]);

    if (verificationError || requestError) {
      throw verificationError ?? requestError ?? new Error("No pudimos reenviar el código.");
    }
  }

  await sendReservationOtpEmail({
    to: request.email,
    fullName: request.fullName,
    code,
    unitName: unit.name,
    checkIn: request.checkIn,
    checkOut: request.checkOut,
    expiresInMinutes: OTP_EXPIRATION_MINUTES
  });

  return {
    requestId: request.id,
    maskedEmail: maskEmail(request.email),
    expiresAt,
    resendAvailableAt
  };
}

export async function createReservationCheckoutFromVerifiedRequest(payload: {
  requestId: string;
}) {
  assertRealDataMode("la generacion del checkout");

  const now = new Date();
  const request = await fetchReservationRequestById(payload.requestId);

  if (!request) {
    throw new Error("Solicitud no encontrada.");
  }

  if (!request.verifiedAt) {
    throw new Error("Primero debes validar el código enviado a tu email.");
  }

  if (!hasMercadoPagoEnv()) {
    throw new Error("Mercado Pago no está configurado. No podemos continuar la reserva sin iniciar el pago.");
  }

  if (request.reservationId) {
    return await getExistingCheckoutForRequest(request);
  }

  const availableUnits = await searchUnits({
    checkIn: request.checkIn,
    checkOut: request.checkOut,
    guests: request.adults,
    unitId: request.unitId
  });

  const selectedUnit = availableUnits.find((unit) => unit.id === request.unitId);

  if (!selectedUnit) {
    await expireReservationRequestHold(request.id);
    throw new Error("La disponibilidad cambió. Vuelve a consultar antes de pagar.");
  }

  const currentPricing = quoteReservationStay({
    checkIn: request.checkIn,
    checkOut: request.checkOut,
    unit: selectedUnit,
    adults: request.adults,
    children: request.children,
    depositPercentage: request.depositPercentage || EMPTY_SITE_SETTINGS.depositPercentage
  });

  const holdExpiresAt = addMinutes(now, RESERVATION_HOLD_MINUTES).toISOString();
  const reservationCode = `LAT-${Date.now().toString().slice(-6)}`;

  if (canUseMockData()) {
    const hold: ReservationHoldRecord = {
      id: crypto.randomUUID(),
      reservationRequestId: request.id,
      unitId: request.unitId,
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      status: "active",
      expiresAt: holdExpiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    mockReservationHolds.unshift(hold);

    const reservation: Reservation = {
      id: crypto.randomUUID(),
      reservationCode,
      guest: {
        id: crypto.randomUUID(),
        fullName: request.fullName,
        phone: request.phone,
        email: request.email,
        city: request.city,
        country: request.country
      },
      unit: {
        id: selectedUnit.id,
        name: selectedUnit.name,
        slug: selectedUnit.slug
      },
      source: "website",
      status: "verified_pending_payment",
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      adults: request.adults,
      children: request.children,
      nights: currentPricing.nights,
      adultsPriceRateId: currentPricing.adultsPriceRateId,
      pricePerNight: currentPricing.pricePerNight,
      subtotal: currentPricing.subtotal,
      cleaningFee: currentPricing.cleaningFee,
      totalAmount: currentPricing.total,
      depositPercentage: currentPricing.depositPercentage ?? EMPTY_SITE_SETTINGS.depositPercentage,
      depositAmount: currentPricing.depositAmount,
      currency: currentPricing.currency,
      specialRequests: request.specialNotes,
      estimatedArrivalTime: request.estimatedArrivalTime,
      createdAt: now.toISOString()
    };
    throw new Error("El modo mock no puede continuar sin un checkout real de Mercado Pago.");
  }

  const supabase = createSupabaseServiceClient();
  let checkout:
    | {
        preferenceId: string;
        checkoutUrl?: string;
      }
    | undefined;

  checkout = await createMercadoPagoPreference({
    reservationCode,
    title: `${selectedUnit.name} - ${currentPricing.nights} noches`,
    amount: currentPricing.depositAmount,
    currency: currentPricing.currency,
    payerName: request.fullName,
    payerEmail: request.email
  });

  if (!checkout.checkoutUrl) {
    throw new Error("Mercado Pago no devolvió una URL de checkout para continuar la reserva.");
  }

  const { data: holdRow, error: holdError } = await supabase
    .from("reservation_holds")
    .insert({
      reservation_request_id: request.id,
      unit_id: request.unitId,
      check_in: request.checkIn,
      check_out: request.checkOut,
      status: "active",
      expires_at: holdExpiresAt
    })
    .select("id")
    .single();

  if (holdError || !holdRow) {
    throw holdError ?? new Error("No pudimos reservar temporalmente la disponibilidad.");
  }

  const { data: guestRow, error: guestError } = await supabase
    .from("guests")
    .insert({
      full_name: request.fullName,
      phone: request.phone,
      email: request.email,
      city: request.city ?? null,
      country: request.country ?? null
    })
    .select("id")
    .single();

  if (guestError || !guestRow) {
    throw guestError ?? new Error("No pudimos crear el huésped.");
  }

  const { data: reservationRow, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      reservation_code: reservationCode,
      guest_id: guestRow.id,
      unit_id: request.unitId,
      source: "website",
      status: checkout ? "verified_pending_payment" : "pending",
      check_in: request.checkIn,
      check_out: request.checkOut,
      adults: request.adults,
      children: request.children,
      nights: currentPricing.nights,
      adults_price_rate_id: currentPricing.adultsPriceRateId,
      price_per_night: currentPricing.pricePerNight,
      subtotal: currentPricing.subtotal,
      cleaning_fee: currentPricing.cleaningFee,
      total_amount: currentPricing.total,
      deposit_percentage: currentPricing.depositPercentage,
      deposit_amount: currentPricing.depositAmount,
      currency: currentPricing.currency,
      special_requests: request.specialNotes ?? null,
      estimated_arrival_time: request.estimatedArrivalTime ?? null
    })
    .select("id, reservation_code")
    .single();

  if (reservationError || !reservationRow) {
    throw reservationError ?? new Error("No pudimos crear la reserva.");
  }

  let payment: Payment | undefined;

  if (checkout) {
    const { data: paymentRow, error: paymentError } = await supabase
      .from("payments")
      .insert({
        reservation_id: reservationRow.id,
        provider: "mercado_pago",
        status: "pending",
        amount: currentPricing.depositAmount,
        currency: currentPricing.currency,
        external_reference: reservationCode,
        checkout_url: checkout.checkoutUrl ?? null,
        provider_preference_id: checkout.preferenceId,
        raw_payload: {
          provider: "mercado_pago",
          reservation_code: reservationCode,
          reservation_request_id: request.id
        }
      })
      .select("id, reservation_id, provider, status, amount, currency, external_reference, checkout_url, provider_preference_id, provider_payment_id, provider_merchant_order_id, paid_at, raw_payload, created_at, updated_at")
      .single();

    if (paymentError || !paymentRow) {
      throw paymentError ?? new Error("No pudimos crear el pago.");
    }

    payment = mapPayment(paymentRow);
  }

  const [{ error: holdUpdateError }, { error: requestUpdateError }] = await Promise.all([
    supabase
      .from("reservation_holds")
      .update({
        reservation_id: reservationRow.id
      })
      .eq("id", holdRow.id),
    supabase
      .from("reservation_requests")
      .update({
        nights: currentPricing.nights,
        adults_price_rate_id: currentPricing.adultsPriceRateId,
        price_per_night: currentPricing.pricePerNight,
        subtotal: currentPricing.subtotal,
        cleaning_fee: currentPricing.cleaningFee,
        total_amount: currentPricing.total,
        deposit_percentage: currentPricing.depositPercentage,
        deposit_amount: currentPricing.depositAmount,
        currency: currentPricing.currency,
        status: "checkout_created",
        reservation_id: reservationRow.id
      })
      .eq("id", request.id)
  ]);

  if (holdUpdateError || requestUpdateError) {
    throw holdUpdateError ?? requestUpdateError ?? new Error("No pudimos vincular la reserva con el hold.");
  }

  try {
    await sendReservationAccessEmail({
      to: request.email,
      fullName: request.fullName,
      reservationCode: reservationRow.reservation_code,
      unitName: selectedUnit.name,
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      totalAmount: currentPricing.total,
      currency: currentPricing.currency,
      checkoutUrl: payment?.checkoutUrl ?? null
    });
  } catch (error) {
    console.error("[reservation-access-email]", error);
  }

  return {
    reservationCode: reservationRow.reservation_code,
    checkoutUrl: payment?.checkoutUrl ?? null,
    paymentId: payment?.id ?? null
  };
}

async function markReservationRequestVerificationExpired(requestId: string) {
  if (canUseMockData()) {
    const requestIndex = mockReservationRequests.findIndex((item) => item.id === requestId);

    if (requestIndex >= 0) {
      mockReservationRequests[requestIndex] = {
        ...mockReservationRequests[requestIndex],
        status: "expired_verification",
        updatedAt: new Date().toISOString()
      };
    }

    return;
  }

  const supabase = createSupabaseServiceClient();
  await supabase
    .from("reservation_requests")
    .update({
      status: "expired_verification"
    })
    .eq("id", requestId);
}

async function updateVerificationAttempts(requestId: string, attemptCount: number, expireRequest: boolean) {
  if (canUseMockData()) {
    const verificationIndex = mockContactVerifications.findIndex((item) => item.reservationRequestId === requestId);

    if (verificationIndex >= 0) {
      mockContactVerifications[verificationIndex] = {
        ...mockContactVerifications[verificationIndex],
        attemptCount,
        updatedAt: new Date().toISOString()
      };
    }

    if (expireRequest) {
      await markReservationRequestVerificationExpired(requestId);
    }

    return;
  }

  const supabase = createSupabaseServiceClient();
  const verification = await fetchContactVerificationByRequestId(requestId);

  if (!verification) {
    return;
  }

  const updates: Array<any> = [];
  updates.push(
    supabase
      .from("contact_verifications")
      .update({
        attempt_count: attemptCount
      })
      .eq("id", verification.id)
  );

  if (expireRequest) {
    updates.push(
      supabase
        .from("reservation_requests")
        .update({
          status: "expired_verification"
        })
        .eq("id", requestId)
    );
  }

  await Promise.all(updates);
}

async function expireReservationRequestHold(requestId: string) {
  const now = new Date().toISOString();

  if (canUseMockData()) {
    const requestIndex = mockReservationRequests.findIndex((item) => item.id === requestId);

    if (requestIndex >= 0) {
      mockReservationRequests[requestIndex] = {
        ...mockReservationRequests[requestIndex],
        status: "expired_hold",
        updatedAt: now
      };
    }

    mockReservationHolds.forEach((hold, index) => {
      if (hold.reservationRequestId === requestId && hold.status === "active") {
        mockReservationHolds[index] = {
          ...hold,
          status: "expired",
          releasedAt: now,
          updatedAt: now
        };
      }
    });

    return;
  }

  const supabase = createSupabaseServiceClient();
  await Promise.all([
    supabase
      .from("reservation_requests")
      .update({
        status: "expired_hold"
      })
      .eq("id", requestId),
    supabase
      .from("reservation_holds")
      .update({
        status: "expired",
        released_at: now
      })
      .eq("reservation_request_id", requestId)
      .eq("status", "active")
  ]);
}

async function getExistingCheckoutForRequest(request: ReservationRequestRecord) {
  if (!request.reservationId) {
    throw new Error("La solicitud todavía no generó una reserva.");
  }

  assertRealDataMode("la recuperacion del checkout");

  const supabase = createSupabaseServiceClient();
  const [{ data: reservationRow, error: reservationError }, { data: paymentRow, error: paymentError }] = await Promise.all([
    supabase
      .from("reservations")
      .select("reservation_code")
      .eq("id", request.reservationId)
      .single(),
    supabase
      .from("payments")
      .select("id, checkout_url")
      .eq("reservation_id", request.reservationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (reservationError || !reservationRow) {
    throw reservationError ?? new Error("La reserva asociada no existe.");
  }

  if (paymentError) {
    throw paymentError;
  }

  return {
    reservationCode: reservationRow.reservation_code,
    checkoutUrl: paymentRow?.checkout_url ?? null,
    paymentId: paymentRow?.id ?? null
  };
}

export async function createReservationRequest(payload: {
  fullName: string;
  phone: string;
  email: string;
  city?: string;
  country?: string;
  adults: number;
  children?: number;
  unitId?: string;
  checkIn: string;
  checkOut: string;
  specialNotes?: string;
  estimatedArrivalTime?: string;
}) {
  assertRealDataMode("la creacion de reservas publicas");

  const supabase = createSupabaseServiceClient();
  const [units, siteSettings] = await Promise.all([
    fetchUnits({ activeOnly: true }),
    fetchSiteSettings()
  ]);
  const selectedUnit = payload.unitId
    ? units.find((unit) => unit.id === payload.unitId)
    : units[0];

  if (!selectedUnit) {
    throw new Error("No active units available to create reservation.");
  }

  const availableUnits = await searchUnits({
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    guests: payload.adults,
    unitId: selectedUnit.id
  });

  if (!availableUnits.some((unit) => unit.id === selectedUnit.id)) {
    throw new Error("The selected unit is not available for the requested date range.");
  }

  const pricing = quoteReservationStay({
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    unit: selectedUnit,
    adults: payload.adults,
    children: payload.children,
    depositPercentage: siteSettings.depositPercentage
  });

  let checkout:
    | {
        preferenceId: string;
        checkoutUrl?: string;
      }
    | undefined;
  const reservationCode = `LAT-${Date.now().toString().slice(-6)}`;

  if (hasMercadoPagoEnv()) {
    checkout = await createMercadoPagoPreference({
      reservationCode,
      title: `${selectedUnit.name} - ${pricing.nights} noches`,
      amount: pricing.depositAmount,
      currency: pricing.currency,
      payerName: payload.fullName,
      payerEmail: payload.email
    });
  }

  const { data: guestRow, error: guestError } = await supabase
    .from("guests")
    .insert({
      full_name: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      city: payload.city ?? null,
      country: payload.country ?? null
    })
    .select("id, full_name, phone, email, city, country")
    .single();

  if (guestError || !guestRow) {
    throw guestError ?? new Error("Unable to create guest.");
  }

  const { data: reservationRow, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      reservation_code: reservationCode,
      guest_id: guestRow.id,
      unit_id: selectedUnit.id,
      source: "website",
      status: checkout ? "pending_payment" : "pending",
      check_in: payload.checkIn,
      check_out: payload.checkOut,
      adults: payload.adults,
      children: payload.children ?? 0,
      nights: pricing.nights,
      adults_price_rate_id: pricing.adultsPriceRateId,
      price_per_night: pricing.pricePerNight,
      subtotal: pricing.subtotal,
      cleaning_fee: pricing.cleaningFee,
      total_amount: pricing.total,
      deposit_percentage: pricing.depositPercentage,
      deposit_amount: pricing.depositAmount,
      currency: pricing.currency,
      special_requests: payload.specialNotes ?? null,
      estimated_arrival_time: payload.estimatedArrivalTime ?? null
    })
    .select(`
      id,
      reservation_code,
      source,
      status,
      check_in,
      check_out,
      adults,
      children,
      nights,
      adults_price_rate_id,
      price_per_night,
      subtotal,
      cleaning_fee,
      total_amount,
      deposit_percentage,
      deposit_amount,
      currency,
      special_requests,
      estimated_arrival_time,
      admin_notes,
      created_at,
      guests (
        id,
        full_name,
        phone,
        email,
        city,
        country,
        notes
      ),
      units (
        id,
        name,
        slug
      )
    `)
    .single();

  if (reservationError || !reservationRow) {
    throw reservationError ?? new Error("Unable to create reservation.");
  }

  let payment: Payment | undefined;

  if (checkout) {
    const { data: paymentRow, error: paymentError } = await supabase
      .from("payments")
      .insert({
        reservation_id: reservationRow.id,
        provider: "mercado_pago",
        status: "pending",
        amount: pricing.depositAmount,
        currency: pricing.currency,
        external_reference: reservationCode,
        checkout_url: checkout.checkoutUrl ?? null,
        provider_preference_id: checkout.preferenceId,
        raw_payload: {
          provider: "mercado_pago",
          reservation_code: reservationCode
        }
      })
      .select("id, reservation_id, provider, status, amount, currency, external_reference, checkout_url, provider_preference_id, provider_payment_id, provider_merchant_order_id, paid_at, raw_payload, created_at, updated_at")
      .single();

    if (paymentError || !paymentRow) {
      throw paymentError ?? new Error("Unable to create payment.");
    }

    payment = mapPayment(paymentRow);
  }

  return {
    reservation: mapReservation(reservationRow),
    payment,
    checkoutUrl: payment?.checkoutUrl
  };
}

export async function createInquiry(payload: {
  fullName: string;
  phone: string;
  email: string;
  message: string;
  checkIn?: string;
  checkOut?: string;
  guestsCount?: number;
  unitId?: string;
  source?: string;
}) {
  assertRealDataMode("las consultas publicas");

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      full_name: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      message: payload.message,
      check_in: payload.checkIn ?? null,
      check_out: payload.checkOut ?? null,
      guests_count: payload.guestsCount ?? null,
      unit_id: payload.unitId ?? null,
      source: payload.source ?? "website",
      status: "new"
    })
    .select("id, full_name, phone, email, message, check_in, check_out, guests_count, unit_id, source, status, created_at")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create inquiry.");
  }

  return mapInquiry(data);
}

export async function lookupPublicReservation(payload: {
  email: string;
  reservationCode: string;
}): Promise<PublicReservationLookup> {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedCode = payload.reservationCode.trim().toLowerCase();

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(`
      id,
      reservation_code,
      status,
      check_in,
      check_out,
      adults,
      children,
      total_amount,
      currency,
      guests (
        email
      ),
      units (
        name
      )
    `)
    .ilike("reservation_code", payload.reservationCode.trim())
    .eq("guests.email", normalizedEmail)
    .limit(1);

  if (error) {
    throw error;
  }

  const reservationRow = ((data ?? []) as PublicReservationLookupRow[]).find(
    (item) =>
      item.reservation_code.trim().toLowerCase() === normalizedCode &&
      item.guests?.[0]?.email?.trim().toLowerCase() === normalizedEmail
  );

  if (!reservationRow) {
    throw new Error(PUBLIC_RESERVATION_LOOKUP_ERROR);
  }

  const { data: paymentRow, error: paymentError } = await supabase
    .from("payments")
    .select("status, checkout_url")
    .eq("reservation_id", reservationRow.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) {
    throw paymentError;
  }

  return mapPublicReservationLookup(
    reservationRow,
    paymentRow
      ? {
          status: paymentRow.status,
          checkoutUrl: paymentRow.checkout_url ?? undefined
        }
      : null
  );
}

export async function getAdminState(): Promise<AdminState> {
  if (canUseMockData()) {
    const { adminSeedState } = await import("@/data/admin-seed");
    return adminSeedState;
  }

  const supabase = createSupabaseServiceClient();
  const [
    reservations,
    blocks,
    inquiries,
    units,
    payments,
    inventory,
    { data: guestsRows },
    { data: galleryRows },
    { data: seasonRows },
    profileRows,
    { data: contentRows },
    { data: siteSettingsRows },
    siteSettings
  ] = await Promise.all([
    fetchReservations(),
    fetchAvailabilityBlocks(),
    fetchInquiries(),
    fetchUnits(),
    fetchPayments(),
    fetchInventory(),
    supabase.from("guests").select("id, full_name, email, phone, city"),
    supabase.from("gallery_items").select("id, title, category, image_url, storage_path").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("price_seasons").select("id, name, start_date, end_date, prices_json").order("start_date", { ascending: true }),
    fetchAdminProfiles(),
    supabase.from("pages_content").select("section, content_json").eq("page", "home"),
    supabase.from("site_settings").select("key, value_json"),
    fetchSiteSettings()
  ]);

  const contentMap = Object.fromEntries((contentRows ?? []).map((row) => [row.section, row.content_json ?? {}]));
  const settingsMap = Object.fromEntries((siteSettingsRows ?? []).map((row) => [row.key, row.value_json ?? {}]));
  const generalSettings = settingsMap.general ?? {};

  return ({
    reservations: reservations.map((reservation) => ({
      id: reservation.reservationCode,
      guestName: reservation.guest.fullName,
      guestEmail: reservation.guest.email,
      guestPhone: reservation.guest.phone,
      accommodationId: reservation.unit.id,
      accommodationName: reservation.unit.name,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guests: reservation.adults + reservation.children,
      total: reservation.totalAmount,
      status: reservation.status,
      source: reservation.source,
      notes: reservation.specialRequests
    })),
    payments: payments.map((payment) => {
      const reservation = reservations.find((item) => item.id === payment.reservationId);
      return {
        id: payment.id,
        reservationId: payment.reservationId,
        reservationCode: reservation?.reservationCode ?? payment.externalReference,
        guestName: reservation?.guest.fullName ?? "Huésped",
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt
      };
    }),
    guests: (guestsRows ?? []).map((guest) => ({
      id: guest.id,
      name: guest.full_name,
      email: guest.email,
      phone: guest.phone,
      city: guest.city ?? "",
      reservationsCount: reservations.filter((reservation) => reservation.guest.id === guest.id).length,
      status:
        reservations.filter((reservation) => reservation.guest.id === guest.id).length > 1
          ? ("frequent" as const)
          : ("new" as const)
    })),
    inquiries: inquiries.map((inquiry) => {
      const parsedInquiryContent = parseInquiryMessageContent(inquiry.message);

      return {
        id: inquiry.id,
        createdAt: inquiry.createdAt,
        name: inquiry.fullName,
        contact: inquiry.phone || inquiry.email,
        channel: mapSourceToInquiryChannel(inquiry.source),
        subject: parsedInquiryContent.subject,
        message: parsedInquiryContent.message,
        status: mapInquiryStatusToAdmin(inquiry.status)
      };
    }),
    units: units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      capacity: unit.maxGuests,
      beds: unit.beds,
      price: unit.fromPricePerNight,
      fromPricePerNight: unit.fromPricePerNight,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      cleaningFee: unit.cleaningFee,
      image: unit.featuredImage,
      images: unit.images.map((image) => ({
        id: image.id,
        url: image.imageUrl,
        altText: image.altText,
        sortOrder: image.sortOrder,
        storagePath: image.storagePath
      })),
      status: unit.active ? "active" : "draft",
      shortDescription: unit.shortDescription,
      description: unit.description,
      amenities: unit.amenities.map((amenity) => amenity.name),
      highlights: unit.highlights,
      details: unit.details,
      adultPriceRates: unit.adultPriceRates.map((rate) => ({
        id: rate.id,
        adults: rate.adults,
        pricePerNight: rate.pricePerNight,
        active: rate.active
      }))
    })),
    inventory: inventory.map((item) => ({
      id: item.id,
      accommodationId: item.unitId,
      date: item.date,
      availableUnits: item.availableUnits,
      stopSell: item.stopSell,
      closedToArrival: item.closedToArrival,
      closedToDeparture: item.closedToDeparture,
      minStay: item.minStay,
      maxStay: item.maxStay,
      baseRate: item.baseRate
    })),
    availabilityBlocks: blocks.map((block) => ({
      id: block.id,
      accommodationId: block.unitId,
      accommodationName: units.find((unit) => unit.id === block.unitId)?.name ?? "Unidad",
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason,
      createdBy: "Administrador"
    })),
    priceSeasons: (seasonRows ?? []).map((season) => ({
      id: season.id,
      name: season.name,
      startDate: season.start_date,
      endDate: season.end_date,
      prices: season.prices_json ?? {}
    })),
    gallery: (galleryRows ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      image: item.image_url,
      storagePath: item.storage_path ?? undefined
    })),
    users: (profileRows ?? []).map((profile) => ({
      id: profile.id,
      name: profile.full_name ?? "Usuario",
      email: profile.email,
      role: mapDatabaseRoleToAdmin(profile.role),
      status: (profile.status ?? "active") as AdminUser["status"],
      lastAccess: profile.created_at
    })),
    legacySiteContent: {
      heroTitle: contentMap.hero?.title ?? "Los Álamos Tilcara",
      heroSubtitle: contentMap.hero?.subtitle ?? "",
      heroImage: contentMap.hero?.image ?? units[0]?.featuredImage ?? "",
      aboutTitle: "Sobre nosotros",
      aboutBody: contentMap.about?.body ?? "",
      testimonialsTitle: "Lo que dicen nuestros huéspedes",
      locationTitle: "Ubicación",
      policiesTitle: "Políticas",
      faqs: (contentMap.faqs?.items ?? []).map((faq: { id?: string; question: string; answer: string }, index: number) => ({
        id: faq.id ?? `faq-${index + 1}`,
        question: faq.question,
        answer: faq.answer
      })),
      policies: (contentMap.policies?.items ?? []).map((policy: { title: string; body: string }, index: number) => ({
        id: `policy-${index + 1}`,
        title: policy.title,
        body: policy.body
      }))
    },
    siteContent: {
      heroEyebrow: contentMap.hero?.eyebrow ?? "",
      heroTitle: contentMap.hero?.title ?? "",
      heroSubtitle: contentMap.hero?.subtitle ?? "",
      heroImage: contentMap.hero?.image ?? units[0]?.featuredImage ?? "",
      heroTrustPoints: contentMap.hero?.trustPoints ?? [],
      aboutTitle: contentMap.about?.title ?? "",
      aboutBody: contentMap.about?.body ?? "",
      testimonialsTitle: contentMap.testimonials?.title ?? "",
      locationTitle: contentMap.location?.title ?? "",
      policiesTitle: contentMap.policies?.title ?? "",
      faqs: ((contentMap.faqs?.items as Array<{ id?: string; question?: string; answer?: string }> | undefined) ?? []).map((faq, index) => ({
        id: faq.id ?? `faq-${index + 1}`,
        question: faq.question ?? "",
        answer: faq.answer ?? ""
      })),
      policies: ((contentMap.policies?.items as Array<{ id?: string; title?: string; body?: string }> | undefined) ?? []).map((policy, index) => ({
        id: policy.id ?? `policy-${index + 1}`,
        title: policy.title ?? "",
        body: policy.body ?? ""
      }))
    },
    legacySettings: {
      propertyName: "Los Álamos Tilcara",
      contactEmail: siteSettings.email,
      phone: siteSettings.phone,
      currency: "ARS",
      timezone: "America/Argentina/Buenos_Aires",
      checkInTime: "15:00",
      checkOutTime: "10:00",
      address: siteSettings.address
    },
    settings: {
      propertyName: generalSettings.propertyName ?? "",
      whatsappNumber: siteSettings.whatsappNumber,
      contactEmail: siteSettings.email,
      phone: siteSettings.phone,
      instagramUrl: siteSettings.instagramUrl,
      facebookUrl: siteSettings.facebookUrl,
      googleReviewsUrl: siteSettings.googleReviewsUrl ?? "",
      googleMapsUrl: siteSettings.googleMapsUrl ?? "",
      currency: generalSettings.currency ?? "",
      timezone: generalSettings.timezone ?? "",
      checkInTime: generalSettings.checkInTime ?? "",
      checkOutTime: generalSettings.checkOutTime ?? "",
      depositPercentage: parseSupabaseNumber(
        generalSettings.depositPercentage ?? siteSettings.depositPercentage,
        10
      ),
      address: siteSettings.address,
      city: siteSettings.city,
      region: siteSettings.region
    }
  } as AdminState);
}

function deriveReservationStatus(status: string): "active" | "draft" | "maintenance" {
  if (status === "maintenance") {
    return "maintenance";
  }

  return status === "active" ? "active" : "draft";
}

function buildInquiryMessage(subject: string, message: string) {
  const normalizedSubject = subject.trim();
  const normalizedMessage = message.trim();

  if (!normalizedSubject) {
    return normalizedMessage;
  }

  if (!normalizedMessage) {
    return `Subject: ${normalizedSubject}`;
  }

  return `Subject: ${normalizedSubject}\n\n${normalizedMessage}`;
}

function parseInquiryMessageContent(message: string) {
  const normalizedMessage = message.trim();
  const subjectPrefix = "Subject:";

  if (!normalizedMessage) {
    return {
      subject: "",
      message: ""
    };
  }

  if (!normalizedMessage.startsWith(subjectPrefix)) {
    return {
      subject: normalizedMessage.slice(0, 72),
      message: normalizedMessage
    };
  }

  const [, ...rest] = normalizedMessage.split(/\r?\n/);
  const subject = normalizedMessage.slice(subjectPrefix.length).split(/\r?\n/, 1)[0]?.trim() ?? "";
  const body = rest.join("\n").trim();

  return {
    subject,
    message: body || subject
  };
}

function mapInquiryStatusToAdmin(status: string): AdminInquiry["status"] {
  if (status === "contacted") {
    return "in_progress";
  }

  if (status === "converted" || status === "closed") {
    return "resolved";
  }

  return "new";
}

function mapAdminInquiryStatusToDatabase(status: AdminInquiry["status"]) {
  if (status === "in_progress") {
    return "contacted";
  }

  if (status === "resolved") {
    return "closed";
  }

  return "new";
}

function mapInquiryChannelToSource(channel: AdminInquiry["channel"]) {
  if (channel === "WhatsApp") {
    return "whatsapp";
  }

  if (channel === "Instagram") {
    return "instagram";
  }

  if (channel === "Email") {
    return "email";
  }

  return "website";
}

function mapSourceToInquiryChannel(source: string): AdminInquiry["channel"] {
  if (source === "whatsapp") {
    return "WhatsApp";
  }

  if (source === "instagram") {
    return "Instagram";
  }

  if (source === "email") {
    return "Email";
  }

  return "Web";
}

function mapAdminRoleToDatabase(role: AdminUser["role"]): "admin" | "staff" {
  return role === "Administrador" ? "admin" : "staff";
}

function mapDatabaseRoleToAdmin(role: string): AdminUser["role"] {
  return role === "admin" ? "Administrador" : "Editor";
}

export async function upsertAdminReservation(payload: {
  id?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  accommodationId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: Reservation["status"];
  source: string;
  notes?: string;
}) {
  const supabase = createSupabaseServiceClient();
  const [units, reservations, blocks] = await Promise.all([
    fetchUnits(),
    fetchReservations(),
    fetchAvailabilityBlocks()
  ]);
  const unit = units.find((item) => item.id === payload.accommodationId);

  if (!unit) {
    throw new Error("The selected unit does not exist.");
  }

  if (payload.checkIn >= payload.checkOut) {
    throw new Error("Check-out must be after check-in.");
  }

  const conflictingReservation = reservations.find(
    (reservation) =>
      reservation.id !== payload.id &&
      reservation.unit.id === payload.accommodationId &&
      ["pending_payment", "verified_pending_payment", "confirmed", "completed", "no_show"].includes(reservation.status) &&
      payload.checkIn < reservation.checkOut &&
      payload.checkOut > reservation.checkIn
  );

  if (conflictingReservation) {
    throw new Error("There is already a reservation blocking that date range.");
  }

  const conflictingBlock = blocks.find(
    (block) =>
      block.id !== payload.id &&
      block.unitId === payload.accommodationId &&
      payload.checkIn < block.endDate &&
      payload.checkOut > block.startDate
  );

  if (conflictingBlock) {
    throw new Error("There is an availability block for that date range.");
  }

  const nights = calculateNights(payload.checkIn, payload.checkOut);
  const subtotal = Math.max(payload.total - unit.cleaningFee, 0);

  if (payload.id) {
    const { data: currentReservation, error: reservationLookupError } = await supabase
      .from("reservations")
      .select("id, reservation_code, guest_id")
      .eq("reservation_code", payload.id)
      .single();

    if (reservationLookupError || !currentReservation) {
      throw reservationLookupError ?? new Error("Reservation not found.");
    }

    const { error: guestError } = await supabase
      .from("guests")
      .update({
        full_name: payload.guestName,
        email: payload.guestEmail,
        phone: payload.guestPhone
      })
      .eq("id", currentReservation.guest_id);

    if (guestError) {
      throw guestError;
    }

    const { data: updatedReservation, error: reservationError } = await supabase
      .from("reservations")
      .update({
        unit_id: payload.accommodationId,
        check_in: payload.checkIn,
        check_out: payload.checkOut,
        adults: payload.guests,
        children: 0,
        nights,
        subtotal,
        cleaning_fee: unit.cleaningFee,
        total_amount: payload.total,
        status: payload.status,
        source: payload.source,
        special_requests: payload.notes ?? null
      })
      .eq("id", currentReservation.id)
      .select(`
        id,
        reservation_code,
        source,
        status,
        check_in,
        check_out,
        adults,
        children,
        nights,
        subtotal,
        cleaning_fee,
        total_amount,
        currency,
        special_requests,
        estimated_arrival_time,
        admin_notes,
        created_at,
        guests (
          id,
          full_name,
          phone,
          email,
          city,
          country,
          notes
        ),
        units (
          id,
          name,
          slug
        )
      `)
      .single();

    if (reservationError || !updatedReservation) {
      throw reservationError ?? new Error("Unable to update reservation.");
    }

    const guest = Array.isArray(updatedReservation.guests)
      ? updatedReservation.guests[0]
      : updatedReservation.guests;
    const reservationUnit = Array.isArray(updatedReservation.units)
      ? updatedReservation.units[0]
      : updatedReservation.units;

    return {
      id: updatedReservation.reservation_code,
      guestName: guest.full_name,
      guestEmail: guest.email,
      guestPhone: guest.phone,
      accommodationId: reservationUnit.id,
      accommodationName: reservationUnit.name,
      checkIn: updatedReservation.check_in,
      checkOut: updatedReservation.check_out,
      guests: updatedReservation.adults + updatedReservation.children,
      total: Number(updatedReservation.total_amount),
      status: updatedReservation.status,
      source: updatedReservation.source,
      notes: updatedReservation.special_requests ?? ""
    } satisfies AdminState["reservations"][number];
  }

  const { data: guestRow, error: guestError } = await supabase
    .from("guests")
    .insert({
      full_name: payload.guestName,
      email: payload.guestEmail,
      phone: payload.guestPhone
    })
    .select("id")
    .single();

  if (guestError || !guestRow) {
    throw guestError ?? new Error("Unable to create guest.");
  }

  const reservationCode = `LAT-${Date.now().toString().slice(-6)}`;
  const { data: reservationRow, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      reservation_code: reservationCode,
      guest_id: guestRow.id,
      unit_id: payload.accommodationId,
      source: payload.source,
      status: payload.status,
      check_in: payload.checkIn,
      check_out: payload.checkOut,
      adults: payload.guests,
      children: 0,
      nights,
      subtotal,
      cleaning_fee: unit.cleaningFee,
      total_amount: payload.total,
      currency: "ARS",
      special_requests: payload.notes ?? null
    })
    .select(`
      reservation_code,
      source,
      status,
      check_in,
      check_out,
      adults,
      children,
      total_amount,
      guests (
        full_name,
        phone,
        email
      ),
      units (
        id,
        name
      )
    `)
    .single();

  if (reservationError || !reservationRow) {
    throw reservationError ?? new Error("Unable to create reservation.");
  }

  const guest = Array.isArray(reservationRow.guests)
    ? reservationRow.guests[0]
    : reservationRow.guests;
  const reservationUnit = Array.isArray(reservationRow.units)
    ? reservationRow.units[0]
    : reservationRow.units;

  return {
    id: reservationRow.reservation_code,
    guestName: guest.full_name,
    guestEmail: guest.email,
    guestPhone: guest.phone,
    accommodationId: reservationUnit.id,
    accommodationName: reservationUnit.name,
    checkIn: reservationRow.check_in,
    checkOut: reservationRow.check_out,
    guests: reservationRow.adults + reservationRow.children,
    total: Number(reservationRow.total_amount),
    status: reservationRow.status,
    source: reservationRow.source,
    notes: payload.notes ?? ""
  } satisfies AdminState["reservations"][number];
}

export async function removeAdminReservation(reservationCode: string) {
  const supabase = createSupabaseServiceClient();
  const { data: reservationRow, error } = await supabase
    .from("reservations")
    .select("id")
    .eq("reservation_code", reservationCode)
    .single();

  if (error || !reservationRow) {
    throw error ?? new Error("Reservation not found.");
  }

  const { error: deleteError } = await supabase
    .from("reservations")
    .delete()
    .eq("id", reservationRow.id);

  if (deleteError) {
    throw deleteError;
  }
}

export async function upsertAvailabilityBlock(payload: {
  id?: string;
  accommodationId: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdBy: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = payload.id
    ? await supabase
        .from("availability_blocks")
        .update({
          unit_id: payload.accommodationId,
          start_date: payload.startDate,
          end_date: payload.endDate,
          reason: payload.reason,
          notes: payload.createdBy
        })
        .eq("id", payload.id)
        .select("id, unit_id, start_date, end_date, reason, notes")
        .single()
    : await supabase
        .from("availability_blocks")
        .insert({
          unit_id: payload.accommodationId,
          start_date: payload.startDate,
          end_date: payload.endDate,
          reason: payload.reason,
          notes: payload.createdBy
        })
        .select("id, unit_id, start_date, end_date, reason, notes")
        .single();

  if (error || !data) {
    throw error ?? new Error("Unable to save availability block.");
  }

  const units = await fetchUnits();
  const unit = units.find((item) => item.id === data.unit_id);

  return {
    id: data.id,
    accommodationId: data.unit_id,
    accommodationName: unit?.name ?? "Unidad",
    startDate: data.start_date,
    endDate: data.end_date,
    reason: data.reason,
    createdBy: data.notes ?? payload.createdBy
  } satisfies AdminState["availabilityBlocks"][number];
}

export async function removeAvailabilityBlock(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("availability_blocks").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function upsertAdminGuest(payload: {
  id?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
}) {
  const supabase = createSupabaseServiceClient();
  const guestResult = payload.id
    ? await supabase
        .from("guests")
        .update({
          full_name: payload.name,
          email: payload.email,
          phone: payload.phone,
          city: payload.city
        })
        .eq("id", payload.id)
        .select("id, full_name, email, phone, city")
        .single()
    : await supabase
        .from("guests")
        .insert({
          full_name: payload.name,
          email: payload.email,
          phone: payload.phone,
          city: payload.city
        })
        .select("id, full_name, email, phone, city")
        .single();

  if (guestResult.error || !guestResult.data) {
    throw guestResult.error ?? new Error("No pudimos guardar el huesped.");
  }

  const { count, error: reservationsCountError } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("guest_id", guestResult.data.id);

  if (reservationsCountError) {
    throw reservationsCountError;
  }

  const reservationsCount = count ?? 0;

  return {
    id: guestResult.data.id,
    name: guestResult.data.full_name,
    email: guestResult.data.email,
    phone: guestResult.data.phone,
    city: guestResult.data.city ?? "",
    reservationsCount,
    status: reservationsCount > 1 ? "frequent" : "new"
  } satisfies AdminState["guests"][number];
}

export async function removeAdminGuest(id: string) {
  const supabase = createSupabaseServiceClient();
  const { count, error: reservationsCountError } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("guest_id", id);

  if (reservationsCountError) {
    throw reservationsCountError;
  }

  if ((count ?? 0) > 0) {
    throw new Error("No puedes eliminar un huesped que ya tiene reservas asociadas.");
  }

  const { error } = await supabase.from("guests").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function upsertAdminInquiry(payload: {
  id?: string;
  name: string;
  contact: string;
  channel: AdminInquiry["channel"];
  subject: string;
  message: string;
  status: AdminInquiry["status"];
}) {
  const supabase = createSupabaseServiceClient();
  const fullMessage = buildInquiryMessage(payload.subject, payload.message);
  const inquiryResult = payload.id
    ? await supabase
        .from("inquiries")
        .update({
          full_name: payload.name,
          phone: payload.contact,
          email: payload.contact,
          message: fullMessage,
          source: mapInquiryChannelToSource(payload.channel),
          status: mapAdminInquiryStatusToDatabase(payload.status)
        })
        .eq("id", payload.id)
        .select("id, full_name, phone, email, message, source, status, created_at")
        .single()
    : await supabase
        .from("inquiries")
        .insert({
          full_name: payload.name,
          phone: payload.contact,
          email: payload.contact,
          message: fullMessage,
          source: mapInquiryChannelToSource(payload.channel),
          status: mapAdminInquiryStatusToDatabase(payload.status)
        })
        .select("id, full_name, phone, email, message, source, status, created_at")
        .single();

  if (inquiryResult.error || !inquiryResult.data) {
    throw inquiryResult.error ?? new Error("No pudimos guardar la consulta.");
  }

  const parsedMessage = parseInquiryMessageContent(inquiryResult.data.message);

  return {
    id: inquiryResult.data.id,
    createdAt: inquiryResult.data.created_at,
    name: inquiryResult.data.full_name,
    contact: inquiryResult.data.phone || inquiryResult.data.email,
    channel: mapSourceToInquiryChannel(inquiryResult.data.source),
    subject: parsedMessage.subject,
    message: parsedMessage.message,
    status: mapInquiryStatusToAdmin(inquiryResult.data.status)
  } satisfies AdminState["inquiries"][number];
}

export async function removeAdminInquiry(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("inquiries").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function upsertAdminPriceSeason(payload: {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  prices: Record<string, number>;
}) {
  const supabase = createSupabaseServiceClient();
  const seasonResult = payload.id
    ? await supabase
        .from("price_seasons")
        .update({
          name: payload.name,
          start_date: payload.startDate,
          end_date: payload.endDate,
          prices_json: payload.prices
        })
        .eq("id", payload.id)
        .select("id, name, start_date, end_date, prices_json")
        .single()
    : await supabase
        .from("price_seasons")
        .insert({
          name: payload.name,
          start_date: payload.startDate,
          end_date: payload.endDate,
          prices_json: payload.prices
        })
        .select("id, name, start_date, end_date, prices_json")
        .single();

  if (seasonResult.error || !seasonResult.data) {
    throw seasonResult.error ?? new Error("No pudimos guardar la temporada.");
  }

  return {
    id: seasonResult.data.id,
    name: seasonResult.data.name,
    startDate: seasonResult.data.start_date,
    endDate: seasonResult.data.end_date,
    prices: (seasonResult.data.prices_json ?? {}) as Record<string, number>
  } satisfies AdminState["priceSeasons"][number];
}

export async function removeAdminPriceSeason(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("price_seasons").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function upsertAdminUser(payload: {
  id?: string;
  name: string;
  email: string;
  role: AdminUser["role"];
  status: AdminUser["status"];
  password?: string;
}) {
  const supabase = createSupabaseServiceClient();
  const role = mapAdminRoleToDatabase(payload.role);

  if (payload.id) {
    const authUpdatePayload: { email: string; password?: string } = {
      email: payload.email
    };

    if (payload.password?.trim()) {
      authUpdatePayload.password = payload.password.trim();
    }

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(payload.id, authUpdatePayload);

    if (authUpdateError) {
      throw authUpdateError;
    }

    const data = await updateAdminProfileRecord({
      id: payload.id,
      email: payload.email,
      fullName: payload.name,
      role,
      status: payload.status
    });

    return {
      id: data.id,
      name: data.full_name ?? "Usuario",
      email: data.email,
      role: mapDatabaseRoleToAdmin(data.role),
      status: data.status as AdminUser["status"],
      lastAccess: data.created_at
    } satisfies AdminState["users"][number];
  }

  if (!payload.password?.trim()) {
    throw new Error("Debes definir una contrasena para crear el usuario.");
  }

  const { data: authUserResult, error: createAuthUserError } = await supabase.auth.admin.createUser({
    email: payload.email,
    password: payload.password.trim(),
    email_confirm: true,
    user_metadata: {
      full_name: payload.name
    }
  });

  if (createAuthUserError || !authUserResult.user) {
    throw createAuthUserError ?? new Error("No pudimos crear el usuario en autenticacion.");
  }

  const data = await updateAdminProfileRecord({
    id: authUserResult.user.id,
    email: payload.email,
    fullName: payload.name,
    role,
    status: payload.status
  });

  return {
    id: data.id,
    name: data.full_name ?? "Usuario",
    email: data.email,
    role: mapDatabaseRoleToAdmin(data.role),
    status: data.status as AdminUser["status"],
    lastAccess: data.created_at
  } satisfies AdminState["users"][number];
}

export async function removeAdminUser(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) {
    throw error;
  }
}

export async function createGalleryItems(payload: {
  title: string;
  category: string;
  uploads: Array<{ url: string; path: string; fileName: string }>;
}) {
  const supabase = createSupabaseServiceClient();
  const { count } = await supabase
    .from("gallery_items")
    .select("*", { count: "exact", head: true });
  const startOrder = count ?? 0;

  const rows = payload.uploads.map((upload, index) => ({
    title: payload.uploads.length === 1 ? payload.title : `${payload.title} ${index + 1}`,
    category: payload.category,
    image_url: upload.url,
    storage_path: upload.path,
    sort_order: startOrder + index + 1,
    active: true
  }));

  const { data, error } = await supabase
    .from("gallery_items")
    .insert(rows)
    .select("id, title, category, image_url, storage_path");

  if (error || !data) {
    throw error ?? new Error("Unable to create gallery items.");
  }

  return data.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    image: item.image_url,
    storagePath: item.storage_path ?? undefined
  })) satisfies AdminState["gallery"];
}

export async function updateGalleryItem(payload: {
  id: string;
  title: string;
  category: string;
  image?: string;
  storagePath?: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .update({
      title: payload.title,
      category: payload.category,
      ...(payload.image ? { image_url: payload.image } : {}),
      ...(payload.storagePath ? { storage_path: payload.storagePath } : {})
    })
    .eq("id", payload.id)
    .select("id, title, category, image_url, storage_path")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update gallery item.");
  }

  return {
    id: data.id,
    title: data.title,
    category: data.category,
    image: data.image_url,
    storagePath: data.storage_path ?? undefined
  } satisfies AdminState["gallery"][number];
}

export async function removeGalleryItem(id: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw error ?? new Error("Gallery item not found.");
  }

  const { error: deleteError } = await supabase.from("gallery_items").delete().eq("id", id);

  if (deleteError) {
    throw deleteError;
  }

  if (data.storage_path) {
    await removeStorageObjects([data.storage_path]);
  }
}

export async function upsertUnit(payload: {
  id?: string;
  name: string;
  capacity: number;
  bedrooms: number;
  beds: string;
  bathrooms: number;
  cleaningFee: number;
  status: "active" | "maintenance" | "draft";
  shortDescription: string;
  description: string;
  amenities: string[];
  highlights: string[];
  details: UnitDetailItem[];
  adultPriceRates: Array<{
    id?: string;
    adults: number;
    pricePerNight: number;
    active: boolean;
  }>;
  uploads?: Array<{ url: string; path: string; fileName: string }>;
  removedImageIds?: string[];
}) {
  const supabase = createSupabaseServiceClient();
  const slug = payload.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const active = payload.status === "active";
  const shortDescription = payload.shortDescription.trim() || payload.description.trim() || payload.name.trim();
  const details = normalizeUnitDetails(payload.details);
  const highlights = normalizeStringList(payload.highlights);
  const amenityNames = normalizeStringList(payload.amenities);
  const normalizedAdultPriceRates = payload.adultPriceRates
    .map((rate) => ({
      id: rate.id,
      adults: Number(rate.adults),
      pricePerNight: parseSupabaseNumber(rate.pricePerNight),
      active: Boolean(rate.active)
    }))
    .filter((rate) => Number.isInteger(rate.adults) && rate.adults > 0);
  const activeAdultPriceRates = normalizedAdultPriceRates.filter((rate) => rate.active);
  const duplicatedAdults = activeAdultPriceRates
    .map((rate) => rate.adults)
    .find((adults, index, list) => list.indexOf(adults) !== index);

  if (!normalizedAdultPriceRates.length) {
    throw new Error("Debes configurar al menos una tarifa por cantidad de adultos.");
  }

  if (duplicatedAdults) {
    throw new Error("No puede haber dos tarifas activas para la misma cantidad de adultos.");
  }

  if (normalizedAdultPriceRates.some((rate) => rate.adults > payload.capacity)) {
    throw new Error("No puedes guardar tarifas para una cantidad de adultos mayor a la capacidad maxima.");
  }

  if (normalizedAdultPriceRates.some((rate) => rate.pricePerNight < 0 || Number.isNaN(rate.pricePerNight))) {
    throw new Error("Cada tarifa debe tener un precio por noche valido.");
  }

  const fromPricePerNight =
    activeAdultPriceRates.sort((left, right) => left.adults - right.adults)[0]?.pricePerNight ??
    normalizedAdultPriceRates[0]?.pricePerNight ??
    0;

  const unitResult = payload.id
    ? await supabase
        .from("units")
        .update({
          name: payload.name,
          slug,
          short_description: shortDescription,
          description: payload.description,
          max_guests: payload.capacity,
          bedrooms: payload.bedrooms,
          beds: payload.beds,
          bathrooms: payload.bathrooms,
          base_price_per_night: fromPricePerNight,
          cleaning_fee: payload.cleaningFee,
          highlights_json: highlights,
          details_json: details,
          active
        })
        .eq("id", payload.id!)
        .select("id, name, max_guests, beds, base_price_per_night, short_description, active")
        .single()
    : await supabase
        .from("units")
        .insert({
          name: payload.name,
          slug,
          short_description: shortDescription,
          description: payload.description,
          max_guests: payload.capacity,
          bedrooms: payload.bedrooms,
          beds: payload.beds,
          bathrooms: payload.bathrooms,
          base_price_per_night: fromPricePerNight,
          cleaning_fee: payload.cleaningFee,
          highlights_json: highlights,
          details_json: details,
          active
        })
        .select("id, name, max_guests, beds, base_price_per_night, short_description, active")
        .single();

  if (unitResult.error || !unitResult.data) {
    throw unitResult.error ?? new Error("Unable to save unit.");
  }

  const generatedRatePlanCode = `${slug.toUpperCase().replace(/-/g, "_") || "UNIT"}_STD`;
  const { data: existingDefaultRatePlan, error: existingDefaultRatePlanError } = await supabase
    .from("rate_plans")
    .select("code")
    .eq("unit_id", unitResult.data.id)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (existingDefaultRatePlanError) {
    throw existingDefaultRatePlanError;
  }

  const defaultRatePlanCode = existingDefaultRatePlan?.code ?? generatedRatePlanCode;
  const { error: ratePlanSyncError } = await supabase
    .from("rate_plans")
    .upsert({
      unit_id: unitResult.data.id,
      code: defaultRatePlanCode,
      name: `Tarifa Flexible ${payload.name}`,
      description: `Tarifa base para ${payload.name}.`,
      currency: "ARS",
      pricing_mode: "per_night",
      base_price_per_night: fromPricePerNight,
      is_default: true,
      active
    }, { onConflict: "unit_id,code" });

  if (ratePlanSyncError) {
    throw ratePlanSyncError;
  }

  const { data: existingAdultRateRows, error: existingAdultRateRowsError } = await supabase
    .from("adult_price_rates")
    .select("id")
    .eq("unit_id", unitResult.data.id);

  if (existingAdultRateRowsError) {
    throw existingAdultRateRowsError;
  }

  const incomingRateIds = normalizedAdultPriceRates
    .map((rate) => rate.id)
    .filter((value): value is string => Boolean(value));
  const removableRateIds = (existingAdultRateRows ?? [])
    .map((rate) => rate.id)
    .filter((id) => !incomingRateIds.includes(id));

  if (removableRateIds.length) {
    const { error: removeRatesError } = await supabase
      .from("adult_price_rates")
      .delete()
      .eq("unit_id", unitResult.data.id)
      .in("id", removableRateIds);

    if (removeRatesError) {
      throw removeRatesError;
    }
  }

  const { error: upsertAdultRatesError } = await supabase
    .from("adult_price_rates")
    .upsert(
      normalizedAdultPriceRates.map((rate) => ({
        ...(rate.id ? { id: rate.id } : {}),
        unit_id: unitResult.data.id,
        adults: rate.adults,
        price_per_night: rate.pricePerNight,
        active: rate.active
      })),
      { onConflict: "unit_id,adults" }
    );

  if (upsertAdultRatesError) {
    throw upsertAdultRatesError;
  }

  if (payload.removedImageIds?.length) {
    const { data: imagesToRemove, error: imagesToRemoveError } = await supabase
      .from("unit_images")
      .select("id, storage_path")
      .eq("unit_id", unitResult.data.id)
      .in("id", payload.removedImageIds);

    if (imagesToRemoveError) {
      throw imagesToRemoveError;
    }

    const { error: deleteImagesError } = await supabase
      .from("unit_images")
      .delete()
      .eq("unit_id", unitResult.data.id)
      .in("id", payload.removedImageIds);

    if (deleteImagesError) {
      throw deleteImagesError;
    }

    await removeStorageObjects((imagesToRemove ?? []).map((image) => image.storage_path).filter(Boolean));
  }

  if (payload.uploads?.length) {
    const { data: currentImages, error: currentImagesError } = await supabase
      .from("unit_images")
      .select("id")
      .eq("unit_id", unitResult.data.id)
      .order("sort_order", { ascending: true });

    if (currentImagesError) {
      throw currentImagesError;
    }

    const startOrder = currentImages?.length ?? 0;
    const imageRows = payload.uploads.map((upload, index) => ({
      unit_id: unitResult.data.id,
      image_url: upload.url,
      storage_path: upload.path,
      alt_text: payload.name,
      sort_order: startOrder + index + 1
    }));

    const { error: imageError } = await supabase.from("unit_images").insert(imageRows);

    if (imageError) {
      throw imageError;
    }
  }

  await supabase.from("unit_amenities").delete().eq("unit_id", unitResult.data.id);

  if (amenityNames.length) {
    const { error: amenityUpsertError } = await supabase.from("amenities").upsert(
      amenityNames.map((name) => ({
        name
      })),
      { onConflict: "name" }
    );

    if (amenityUpsertError) {
      throw amenityUpsertError;
    }

    const { data: amenityRows, error: amenityFetchError } = await supabase
      .from("amenities")
      .select("id")
      .in("name", amenityNames);

    if (amenityFetchError) {
      throw amenityFetchError;
    }

    if (amenityRows?.length) {
      const { error: unitAmenitiesError } = await supabase.from("unit_amenities").insert(
        amenityRows.map((amenity) => ({
          unit_id: unitResult.data.id,
          amenity_id: amenity.id
        }))
      );

      if (unitAmenitiesError) {
        throw unitAmenitiesError;
      }
    }
  }

  const refreshedUnits = await fetchUnits();
  const unit = refreshedUnits.find((item) => item.id === unitResult.data.id);

  if (!unit) {
    throw new Error("Unable to load saved unit.");
  }

  return {
    id: unit.id,
    name: unit.name,
    capacity: unit.maxGuests,
    bedrooms: unit.bedrooms,
    beds: unit.beds,
    bathrooms: unit.bathrooms,
    price: unit.fromPricePerNight,
    fromPricePerNight: unit.fromPricePerNight,
    cleaningFee: unit.cleaningFee,
    image: unit.featuredImage,
    images: unit.images.map((image) => ({
      id: image.id,
      url: image.imageUrl,
      altText: image.altText,
      sortOrder: image.sortOrder,
      storagePath: image.storagePath
    })),
    status: deriveReservationStatus(payload.status),
    shortDescription: unit.shortDescription,
    description: unit.description,
    amenities: unit.amenities.map((amenity) => amenity.name),
    highlights: unit.highlights,
    details: unit.details,
    adultPriceRates: unit.adultPriceRates.map((rate) => ({
      id: rate.id,
      adults: rate.adults,
      pricePerNight: rate.pricePerNight,
      active: rate.active
    }))
  } satisfies AdminState["units"][number];
}

export async function removeUnit(id: string) {
  const supabase = createSupabaseServiceClient();
  const { data: images, error: imagesError } = await supabase
    .from("unit_images")
    .select("storage_path")
    .eq("unit_id", id);

  if (imagesError) {
    throw imagesError;
  }

  const { error } = await supabase.from("units").delete().eq("id", id);

  if (error) {
    throw error;
  }

  await removeStorageObjects((images ?? []).map((item) => item.storage_path).filter(Boolean));
}

export async function updateAdminContent(payload: {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  heroTrustPoints: string[];
  aboutTitle: string;
  aboutBody: string;
  testimonialsTitle: string;
  locationTitle: string;
  policiesTitle: string;
  faqs: Array<{ id: string; question: string; answer: string }>;
  policies: Array<{ id: string; title: string; body: string }>;
}) {
  const supabase = createSupabaseServiceClient();
  const { error: heroError } = await supabase.from("pages_content").upsert({
    page: "home",
    section: "hero",
    content_json: {
      title: payload.heroTitle,
      subtitle: payload.heroSubtitle,
      image: payload.heroImage,
      trustPoints: ["Reserva directa", "Atención personalizada", "Ubicación ideal"]
    }
  }, { onConflict: "page,section" });

  if (heroError) {
    throw heroError;
  }

  const { error: heroOverrideError } = await supabase.from("pages_content").upsert({
    page: "home",
    section: "hero",
    content_json: {
      eyebrow: payload.heroEyebrow,
      title: payload.heroTitle,
      subtitle: payload.heroSubtitle,
      image: payload.heroImage,
      trustPoints: payload.heroTrustPoints
    }
  }, { onConflict: "page,section" });

  if (heroOverrideError) {
    throw heroOverrideError;
  }

  const { error: aboutError } = await supabase.from("pages_content").upsert({
    page: "home",
    section: "about",
    content_json: {
      title: payload.aboutTitle,
      body: payload.aboutBody
    }
  }, { onConflict: "page,section" });

  if (aboutError) {
    throw aboutError;
  }

  const { error: policiesError } = await supabase.from("pages_content").upsert({
    page: "home",
    section: "policies",
    content_json: {
      items: payload.policies.map(({ title, body }) => ({ title, body }))
    }
  }, { onConflict: "page,section" });

  if (policiesError) {
    throw policiesError;
  }

  const [policiesMetaResult, testimonialsResult, locationResult, faqsSectionResult] = await Promise.all([
    supabase.from("pages_content").upsert({
      page: "home",
      section: "policies",
      content_json: {
        title: payload.policiesTitle,
        items: payload.policies.map(({ title, body }) => ({ title, body }))
      }
    }, { onConflict: "page,section" }),
    supabase.from("pages_content").upsert({
      page: "home",
      section: "testimonials",
      content_json: {
        title: payload.testimonialsTitle
      }
    }, { onConflict: "page,section" }),
    supabase.from("pages_content").upsert({
      page: "home",
      section: "location",
      content_json: {
        title: payload.locationTitle
      }
    }, { onConflict: "page,section" }),
    supabase.from("pages_content").upsert({
      page: "home",
      section: "faqs",
      content_json: {
        items: payload.faqs.map(({ id, question, answer }) => ({ id, question, answer }))
      }
    }, { onConflict: "page,section" })
  ]);

  if (policiesMetaResult.error || testimonialsResult.error || locationResult.error || faqsSectionResult.error) {
    throw policiesMetaResult.error ?? testimonialsResult.error ?? locationResult.error ?? faqsSectionResult.error;
  }

  await supabase.from("faqs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const faqRows = payload.faqs.map((faq, index) => ({
    question: faq.question,
    answer: faq.answer,
    sort_order: index + 1,
    active: true
  }));
  if (faqRows.length) {
    const { error: faqsError } = await supabase.from("faqs").insert(faqRows);
    if (faqsError) {
      throw faqsError;
    }
  }
}

export async function updateAdminSettings(payload: {
  propertyName: string;
  whatsappNumber: string;
  contactEmail: string;
  phone: string;
  instagramUrl: string;
  facebookUrl: string;
  googleReviewsUrl: string;
  googleMapsUrl: string;
  currency: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  depositPercentage: number;
  address: string;
  city: string;
  region: string;
}) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("site_settings").upsert([
    {
      key: "contact",
      value_json: {
        whatsappNumber: payload.whatsappNumber,
        phone: payload.phone,
        email: payload.contactEmail,
        instagramUrl: payload.instagramUrl,
        facebookUrl: payload.facebookUrl
      }
    },
    {
      key: "location",
      value_json: {
        address: payload.address,
        city: payload.city,
        region: payload.region,
        coordinates: EMPTY_SITE_SETTINGS.coordinates,
        googleMapsUrl: payload.googleMapsUrl
      }
    },
    {
      key: "reviews",
      value_json: {
        googleReviewsUrl: payload.googleReviewsUrl,
        googleMapsUrl: payload.googleMapsUrl
      }
    },
    {
      key: "general",
      value_json: {
        propertyName: payload.propertyName,
        currency: payload.currency,
        timezone: payload.timezone,
        checkInTime: payload.checkInTime,
        checkOutTime: payload.checkOutTime,
        depositPercentage: payload.depositPercentage
      }
    }
  ], { onConflict: "key" });

  if (error) {
    throw error;
  }
}

export async function getGoogleHotelCenterFeedData() {
  assertRealDataMode("Google Hotel Center");

  const [siteSettings, units, ratePlans, inventory] = await Promise.all([
    fetchSiteSettings(),
    fetchUnits({ activeOnly: true }),
    fetchRatePlans({ activeOnly: true }),
    fetchInventory({
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10)
    })
  ]);

  return {
    siteSettings,
    units,
    ratePlans,
    inventory
  };
}

export async function syncMercadoPagoPayment(params: {
  externalReference?: string;
  providerPaymentId: string;
  providerStatus: string;
  providerMerchantOrderId?: string;
  amount: number;
  currency: string;
  paidAt?: string;
  rawPayload: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();
  const { data: paymentRow, error: paymentLookupError } = await supabase
    .from("payments")
    .select("id, reservation_id, status, checkout_url")
    .or(
      [
        params.externalReference ? `external_reference.eq.${params.externalReference}` : null,
        `provider_payment_id.eq.${params.providerPaymentId}`
      ]
        .filter(Boolean)
        .join(",")
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentLookupError || !paymentRow) {
    throw paymentLookupError ?? new Error("Payment not found.");
  }

  const nextPaymentStatus =
    params.providerStatus === "approved"
      ? "approved"
      : params.providerStatus === "rejected"
        ? "rejected"
        : params.providerStatus === "cancelled"
          ? "cancelled"
          : params.providerStatus === "expired"
            ? "expired"
            : params.providerStatus === "in_process"
              ? "in_process"
              : params.providerStatus === "authorized"
                ? "authorized"
                : "pending";

  const nextReservationStatus =
    nextPaymentStatus === "approved"
      ? "confirmed"
      : nextPaymentStatus === "rejected" || nextPaymentStatus === "cancelled" || nextPaymentStatus === "expired"
        ? "canceled"
        : "verified_pending_payment";

  const [{ data: updatedPayment, error: paymentError }, reservationUpdate, holdUpdate, requestUpdate] = await Promise.all([
    supabase
      .from("payments")
      .update({
        status: nextPaymentStatus,
        provider_payment_id: params.providerPaymentId,
        provider_merchant_order_id: params.providerMerchantOrderId ?? null,
        paid_at: params.paidAt ?? null,
        raw_payload: params.rawPayload
      })
      .eq("id", paymentRow.id)
      .select("id")
      .single(),
    supabase
      .from("reservations")
      .update({
        status: nextReservationStatus
      })
      .eq("id", paymentRow.reservation_id),
    supabase
      .from("reservation_holds")
      .update({
        status: nextPaymentStatus === "approved" ? "converted" : "released",
        released_at: nextPaymentStatus === "approved" ? null : new Date().toISOString()
      })
      .eq("reservation_id", paymentRow.reservation_id)
      .eq("status", "active"),
    supabase
      .from("reservation_requests")
      .update({
        status: nextPaymentStatus === "approved" ? "completed" : "canceled"
      })
      .eq("reservation_id", paymentRow.reservation_id)
  ]);

  if (paymentError || reservationUpdate.error || holdUpdate.error || requestUpdate.error || !updatedPayment) {
    throw paymentError ?? reservationUpdate.error ?? holdUpdate.error ?? requestUpdate.error ?? new Error("Unable to sync payment.");
  }

  await supabase.from("payment_events").insert({
    payment_id: paymentRow.id,
    provider: "mercado_pago",
    event_type: params.providerStatus,
    external_reference: params.externalReference ?? null,
    provider_payment_id: params.providerPaymentId,
    payload: params.rawPayload
  });

  if (paymentRow.status !== nextPaymentStatus) {
    try {
      await notifyReservationStatusUpdate(
        paymentRow.reservation_id,
        nextPaymentStatus,
        paymentRow.checkout_url ?? null
      );
    } catch (error) {
      console.error("[reservation-status-email]", error);
    }
  }
}

