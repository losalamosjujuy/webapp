import {
  availabilityBlocks as mockAvailabilityBlocks,
  galleryItems as mockGalleryItems,
  inquiries as mockInquiries,
  landingContent as mockLandingContent,
  reservations as mockReservations,
  siteSettings as mockSiteSettings,
  units as mockUnits
} from "@/data/mock-data";
import { sendReservationOtpEmail } from "@/lib/email/reservation-otp";
import { searchAvailableUnits } from "@/lib/availability/availability";
import { buildPricingSnapshot } from "@/lib/pricing/pricing";
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
import { canUseMockData, hasMercadoPagoEnv } from "@/lib/supabase/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { removeStorageObjects } from "@/lib/supabase/storage";
import { calculateNights } from "@/lib/utils/format";
import type { AdminState } from "@/types/admin";
import type {
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
  UnitImage
} from "@/types/domain";

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
  subtotal: number;
  cleaningFee: number;
  totalAmount: number;
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

const PUBLIC_RESERVATION_LOOKUP_ERROR = "No encontramos una reserva con esos datos.";

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

function mapUnit(row: any): Unit {
  const images = (row.unit_images ?? [])
    .map(mapUnitImage)
    .sort((a: UnitImage, b: UnitImage) => a.sortOrder - b.sortOrder);
  const amenities = (row.unit_amenities ?? [])
    .map((item: any) => item.amenities)
    .filter(Boolean)
    .map(mapAmenity);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description ?? "",
    maxGuests: row.max_guests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: Number(row.bathrooms),
    basePricePerNight: Number(row.base_price_per_night),
    cleaningFee: Number(row.cleaning_fee),
    active: row.active,
    featuredImage: images[0]?.imageUrl ?? "",
    amenities,
    images
  };
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
    subtotal: Number(row.subtotal),
    cleaningFee: Number(row.cleaning_fee),
    totalAmount: Number(row.total_amount),
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
    basePricePerNight: Number(row.base_price_per_night),
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
    baseRate: row.base_rate === null || row.base_rate === undefined ? undefined : Number(row.base_rate),
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
    amount: Number(row.amount),
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
    totalAmount: Number(row.total_amount),
    currency: row.currency
  };
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
    subtotal: Number(row.subtotal),
    cleaningFee: Number(row.cleaning_fee),
    totalAmount: Number(row.total_amount),
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
    return mockSiteSettings;
  }

  const byKey = Object.fromEntries(data.map((item) => [item.key, item.value_json ?? {}]));
  const contact = byKey.contact ?? {};
  const location = byKey.location ?? {};
  const reviews = byKey.reviews ?? {};

  return {
    whatsappNumber: contact.whatsappNumber ?? mockSiteSettings.whatsappNumber,
    phone: contact.phone ?? mockSiteSettings.phone,
    email: contact.email ?? mockSiteSettings.email,
    instagramUrl: contact.instagramUrl ?? mockSiteSettings.instagramUrl,
    facebookUrl: contact.facebookUrl ?? mockSiteSettings.facebookUrl,
    googleReviewsUrl: reviews.googleReviewsUrl ?? mockSiteSettings.googleReviewsUrl,
    googleMapsUrl:
      reviews.googleMapsUrl ??
      location.googleMapsUrl ??
      mockSiteSettings.googleMapsUrl,
    address: location.address ?? mockSiteSettings.address,
    city: location.city ?? mockSiteSettings.city,
    region: location.region ?? mockSiteSettings.region,
    coordinates: location.coordinates ?? mockSiteSettings.coordinates
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
      eyebrow: sectionMap.hero?.eyebrow ?? mockLandingContent.hero.eyebrow,
      title: sectionMap.hero?.title ?? mockLandingContent.hero.title,
      subtitle: sectionMap.hero?.subtitle ?? mockLandingContent.hero.subtitle,
      trustPoints: sectionMap.hero?.trustPoints ?? mockLandingContent.hero.trustPoints,
      imageUrl: sectionMap.hero?.image ?? mockLandingContent.hero.imageUrl
    },
    about: sectionMap.about?.body ?? mockLandingContent.about,
    policies: sectionMap.policies?.items ?? mockLandingContent.policies,
    faqs:
      faqRows?.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer
      })) ?? mockLandingContent.faqs,
    testimonials:
      testimonialRows?.map((testimonial) => ({
        id: testimonial.id,
        guestName: testimonial.guest_name,
        quote: testimonial.quote,
        rating: testimonial.rating,
        source: testimonial.source ?? "web",
        active: testimonial.active
      })) ?? mockLandingContent.testimonials
  };
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
    return activeOnly ? mockUnits.filter((unit) => unit.active) : mockUnits;
  }

  return data.map(mapUnit);
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
    .order("created_at", { ascending: false });

  if (error || !data) {
    return mockReservations;
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
    return mockAvailabilityBlocks;
  }

  return data.map(mapAvailabilityBlock);
}

async function fetchReservationRequests() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("reservation_requests")
    .select("id, status, full_name, phone, email, city, country, unit_id, check_in, check_out, adults, children, nights, subtotal, cleaning_fee, total_amount, currency, special_notes, estimated_arrival_time, verified_channel, verification_expires_at, verified_at, reservation_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return mockReservationRequests;
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
    return (
      mockContactVerifications
        .filter((item) => item.reservationRequestId === reservationRequestId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
    );
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
    return mockReservationHolds.filter((hold) => hold.status === "active" && hold.expiresAt > now);
  }

  return data.map(mapReservationHold);
}

async function fetchReservationRequestById(id: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("reservation_requests")
    .select("id, status, full_name, phone, email, city, country, unit_id, check_in, check_out, adults, children, nights, subtotal, cleaning_fee, total_amount, currency, special_notes, estimated_arrival_time, verified_channel, verification_expires_at, verified_at, reservation_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return mockReservationRequests.find((item) => item.id === id) ?? null;
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
    return mockInquiries;
  }

  return data.map(mapInquiry);
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
  ratePlans,
  inventory
}: {
  checkIn: string;
  checkOut: string;
  unit: Unit;
  ratePlans: RatePlan[];
  inventory: InventoryRecord[];
}) {
  const nights = calculateNights(checkIn, checkOut);
  const defaultPlan = getDefaultRatePlan(unit, ratePlans);
  const subtotal = unit.basePricePerNight * nights;

  return {
    nights,
    subtotal,
    cleaningFee: unit.cleaningFee,
    total: subtotal + unit.cleaningFee,
    currency: "ARS",
    ratePlan: defaultPlan
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
  if (canUseMockData()) {
    const selectedUnit = payload.unitId
      ? mockUnits.find((unit) => unit.id === payload.unitId)
      : mockUnits[0];

    if (!selectedUnit) {
      throw new Error("No active units available to create reservation.");
    }

    const availableUnits = searchAvailableUnits({
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guests: payload.adults + (payload.children ?? 0),
      units: [selectedUnit],
      reservations: mockReservations,
      blocks: [...mockAvailabilityBlocks, ...mockReservationHolds.filter((hold) => hold.status === "active" && hold.expiresAt > new Date().toISOString()).map(reservationHoldToBlock)]
    });

    if (!availableUnits.some((unit) => unit.id === selectedUnit.id)) {
      throw new Error("La unidad seleccionada ya no está disponible para esas fechas.");
    }

    const nights = calculateNights(payload.checkIn, payload.checkOut);
    const pricing = buildPricingSnapshot({
      nights,
      basePricePerNight: selectedUnit.basePricePerNight,
      cleaningFee: selectedUnit.cleaningFee
    });

    return {
      unit: selectedUnit,
      pricing: {
        nights,
        subtotal: pricing.subtotal,
        cleaningFee: pricing.cleaningFee,
        total: pricing.total,
        currency: "USD"
      }
    };
  }

  const [units, ratePlans, inventory] = await Promise.all([
    fetchUnits({ activeOnly: true }),
    fetchRatePlans({ activeOnly: true }),
    fetchInventory({
      startDate: payload.checkIn,
      endDate: payload.checkOut
    })
  ]);
  const selectedUnit = payload.unitId
    ? units.find((unit) => unit.id === payload.unitId)
    : units[0];

  if (!selectedUnit) {
    throw new Error("No active units available to create reservation.");
  }

  const activeHolds = await fetchActiveReservationHolds();
  const mergedBlocks = [...(await fetchAvailabilityBlocks()), ...activeHolds.map(reservationHoldToBlock)];
  const availableUnits = searchAvailableUnits({
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    guests: payload.adults + (payload.children ?? 0),
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
    ratePlans,
    inventory
  });

  return {
    unit: selectedUnit,
    pricing
  };
}

export async function getLandingPageData() {
  if (canUseMockData()) {
    return {
      units: mockUnits,
      siteSettings: mockSiteSettings,
      landingContent: mockLandingContent,
      gallery: mockGalleryItems
    };
  }

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
  if (canUseMockData()) {
    const now = new Date("2026-07-04T12:00:00.000Z");
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const reservationsThisMonth = mockReservations.filter(
      (reservation) => new Date(reservation.createdAt) >= startOfMonth
    );
    const pendingRequests = mockReservations.filter((reservation) => reservation.status === "pending");
    const upcomingConfirmed = mockReservations.filter(
      (reservation) =>
        reservation.status === "confirmed" && new Date(reservation.checkIn) >= now
    );

    return {
      metrics: {
        reservationsThisMonth: reservationsThisMonth.length,
        pendingRequests: pendingRequests.length,
        upcomingConfirmed: upcomingConfirmed.length,
        occupancyPercentage: 64,
        blockedDates: mockAvailabilityBlocks.length,
        recentInquiries: mockInquiries.length
      },
      reservations: mockReservations,
      blocks: mockAvailabilityBlocks,
      inquiries: mockInquiries,
      units: mockUnits
    };
  }

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
  const [units, reservations, blocks, inventory, holds] = canUseMockData()
    ? [
        mockUnits,
        mockReservations,
        mockAvailabilityBlocks,
        [] as InventoryRecord[],
        mockReservationHolds.filter((hold) => hold.status === "active" && hold.expiresAt > new Date().toISOString())
      ]
    : await Promise.all([
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
  const now = new Date();
  const verificationExpiresAt = addMinutes(now, OTP_EXPIRATION_MINUTES).toISOString();
  const resendAvailableAt = addSeconds(now, OTP_RESEND_COOLDOWN_SECONDS).toISOString();
  const code = generateOtpCode();
  const otpHash = hashOtpCode(code);
  const { unit, pricing } = await prepareReservationQuote(payload);

  if (canUseMockData()) {
    const request: ReservationRequestRecord = {
      id: crypto.randomUUID(),
      status: "pending_verification",
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      city: payload.city,
      country: payload.country,
      unitId: unit.id,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      adults: payload.adults,
      children: payload.children ?? 0,
      nights: pricing.nights,
      subtotal: pricing.subtotal,
      cleaningFee: pricing.cleaningFee,
      totalAmount: pricing.total,
      currency: pricing.currency,
      specialNotes: payload.specialNotes,
      estimatedArrivalTime: payload.estimatedArrivalTime,
      verificationExpiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    const verification: ContactVerificationRecord = {
      id: crypto.randomUUID(),
      reservationRequestId: request.id,
      channel: "email",
      targetEmail: payload.email,
      otpHash,
      expiresAt: verificationExpiresAt,
      attemptCount: 0,
      lastSentAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    mockReservationRequests.unshift(request);
    mockContactVerifications.unshift(verification);

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
      requestId: request.id,
      maskedEmail: maskEmail(payload.email),
      expiresAt: verificationExpiresAt,
      resendAvailableAt
    };
  }

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
      subtotal: pricing.subtotal,
      cleaning_fee: pricing.cleaningFee,
      total_amount: pricing.total,
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
  const unit = (canUseMockData() ? mockUnits : await fetchUnits({ activeOnly: false })).find((item) => item.id === request.unitId);

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
    guests: request.adults + request.children,
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
    ratePlans: [],
    inventory: []
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
      subtotal: currentPricing.subtotal,
      cleaningFee: currentPricing.cleaningFee,
      totalAmount: currentPricing.total,
      currency: currentPricing.currency,
      specialRequests: request.specialNotes,
      estimatedArrivalTime: request.estimatedArrivalTime,
      createdAt: now.toISOString()
    };
    mockReservations.unshift(reservation);

    const requestIndex = mockReservationRequests.findIndex((item) => item.id === request.id);
    const holdIndex = mockReservationHolds.findIndex((item) => item.id === hold.id);

    if (requestIndex >= 0) {
      mockReservationRequests[requestIndex] = {
        ...mockReservationRequests[requestIndex],
        status: "checkout_created",
        reservationId: reservation.id,
        updatedAt: now.toISOString()
      };
    }

    if (holdIndex >= 0) {
      mockReservationHolds[holdIndex] = {
        ...mockReservationHolds[holdIndex],
        reservationId: reservation.id,
        updatedAt: now.toISOString()
      };
    }

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
    amount: currentPricing.total,
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
      subtotal: currentPricing.subtotal,
      cleaning_fee: currentPricing.cleaningFee,
      total_amount: currentPricing.total,
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
        amount: currentPricing.total,
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
        subtotal: currentPricing.subtotal,
        cleaning_fee: currentPricing.cleaningFee,
        total_amount: currentPricing.total,
        currency: currentPricing.currency,
        status: "checkout_created",
        reservation_id: reservationRow.id
      })
      .eq("id", request.id)
  ]);

  if (holdUpdateError || requestUpdateError) {
    throw holdUpdateError ?? requestUpdateError ?? new Error("No pudimos vincular la reserva con el hold.");
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

  if (canUseMockData()) {
    throw new Error("El modo mock no puede recuperar un checkout real de Mercado Pago.");
  }

  if (canUseMockData()) {
    const reservation = mockReservations.find((item) => item.id === request.reservationId);

    if (!reservation) {
      throw new Error("La reserva asociada ya no está disponible.");
    }

    return {
      reservationCode: reservation.reservationCode,
      checkoutUrl: null,
      paymentId: null
    };
  }

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
  if (canUseMockData()) {
    const selectedUnit: Unit | undefined = payload.unitId
      ? mockUnits.find((unit) => unit.id === payload.unitId)
      : mockUnits[0];

    const nights = calculateNights(payload.checkIn, payload.checkOut);
    const pricing = buildPricingSnapshot({
      nights,
      basePricePerNight: selectedUnit?.basePricePerNight ?? 0,
      cleaningFee: selectedUnit?.cleaningFee ?? 0
    });

    const reservation: Reservation = {
      id: crypto.randomUUID(),
      reservationCode: `LAT-${Date.now().toString().slice(-6)}`,
      guest: {
        id: crypto.randomUUID(),
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        city: payload.city,
        country: payload.country
      },
      unit: {
        id: selectedUnit?.id ?? "unassigned",
        name: selectedUnit?.name ?? "Por asignar",
        slug: selectedUnit?.slug ?? "por-asignar"
      },
      source: "website",
      status: hasMercadoPagoEnv() ? "pending_payment" : "pending",
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      adults: payload.adults,
      children: payload.children ?? 0,
      nights,
      subtotal: pricing.subtotal,
      cleaningFee: pricing.cleaningFee,
      totalAmount: pricing.total,
      currency: "USD",
      specialRequests: payload.specialNotes,
      estimatedArrivalTime: payload.estimatedArrivalTime,
      createdAt: new Date().toISOString()
    };

    return {
      reservation,
      payment: undefined,
      checkoutUrl: undefined
    };
  }

  const supabase = createSupabaseServiceClient();
  const [units, ratePlans, inventory] = await Promise.all([
    fetchUnits({ activeOnly: true }),
    fetchRatePlans({ activeOnly: true }),
    fetchInventory({
      startDate: payload.checkIn,
      endDate: payload.checkOut
    })
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
    guests: payload.adults + (payload.children ?? 0),
    unitId: selectedUnit.id
  });

  if (!availableUnits.some((unit) => unit.id === selectedUnit.id)) {
    throw new Error("The selected unit is not available for the requested date range.");
  }

  const pricing = quoteReservationStay({
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    unit: selectedUnit,
    ratePlans,
    inventory
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
      amount: pricing.total,
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
      subtotal: pricing.subtotal,
      cleaning_fee: pricing.cleaningFee,
      total_amount: pricing.total,
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
        amount: pricing.total,
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
  if (canUseMockData()) {
    const inquiry: Inquiry = {
      id: crypto.randomUUID(),
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      message: payload.message,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guestsCount: payload.guestsCount,
      unitId: payload.unitId,
      source: payload.source ?? "website",
      status: "new",
      createdAt: new Date().toISOString()
    };

    mockInquiries.unshift(inquiry);

    return inquiry;
  }

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

  if (canUseMockData()) {
    const reservation = mockReservations.find(
      (item) =>
        item.reservationCode.trim().toLowerCase() === normalizedCode &&
        item.guest.email.trim().toLowerCase() === normalizedEmail
    );

    if (!reservation) {
      throw new Error(PUBLIC_RESERVATION_LOOKUP_ERROR);
    }

    return {
      reservationCode: reservation.reservationCode,
      status: reservation.status,
      unitName: reservation.unit.name,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      adults: reservation.adults,
      children: reservation.children,
      totalAmount: reservation.totalAmount,
      currency: reservation.currency
    };
  }

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
    .limit(2);

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
    { data: profileRows },
    { data: contentRows },
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
    supabase.from("profiles").select("id, full_name, email, role, created_at").order("created_at", { ascending: true }),
    supabase.from("pages_content").select("section, content_json").eq("page", "home"),
    fetchSiteSettings()
  ]);

  const contentMap = Object.fromEntries((contentRows ?? []).map((row) => [row.section, row.content_json ?? {}]));

  return {
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
    inquiries: inquiries.map((inquiry) => ({
      id: inquiry.id,
      createdAt: inquiry.createdAt,
      name: inquiry.fullName,
      contact: inquiry.phone || inquiry.email,
      channel:
        inquiry.source === "whatsapp"
          ? "WhatsApp"
          : inquiry.source === "instagram"
            ? "Instagram"
            : inquiry.source === "email"
              ? "Email"
              : "Web",
      subject: inquiry.message.slice(0, 72),
      message: inquiry.message,
      status:
        inquiry.status === "new"
          ? ("new" as const)
          : inquiry.status === "contacted"
            ? ("in_progress" as const)
            : ("resolved" as const)
    })),
    units: units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      capacity: unit.maxGuests,
      beds: unit.beds,
      price: unit.basePricePerNight,
      image: unit.featuredImage,
      images: unit.images.map((image) => ({
        id: image.id,
        url: image.imageUrl,
        altText: image.altText,
        sortOrder: image.sortOrder,
        storagePath: image.storagePath
      })),
      status: unit.active ? "active" : "draft",
      description: unit.shortDescription
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
      role:
        profile.role === "admin"
          ? ("Administrador" as const)
          : ("Editor" as const),
      status: "active" as const,
      lastAccess: profile.created_at
    })),
    siteContent: {
      heroTitle: contentMap.hero?.title ?? "Los Álamos Tilcara",
      heroSubtitle: contentMap.hero?.subtitle ?? "",
      heroImage: contentMap.hero?.image ?? units[0]?.featuredImage ?? "",
      aboutTitle: "Sobre nosotros",
      aboutBody: contentMap.about?.body ?? "",
      testimonialsTitle: "Lo que dicen nuestros huéspedes",
      locationTitle: "Ubicación",
      policiesTitle: "Políticas",
      faqs: (mockLandingContent.faqs ?? []).map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer
      })),
      policies: (mockLandingContent.policies ?? []).map((policy, index) => ({
        id: `policy-${index + 1}`,
        title: policy.title,
        body: policy.body
      }))
    },
    settings: {
      propertyName: "Los Álamos Tilcara",
      contactEmail: siteSettings.email,
      phone: siteSettings.phone,
      currency: "ARS",
      timezone: "America/Argentina/Buenos_Aires",
      checkInTime: "15:00",
      checkOutTime: "10:00",
      address: siteSettings.address
    }
  };
}

function deriveReservationStatus(status: string): "active" | "draft" | "maintenance" {
  if (status === "maintenance") {
    return "maintenance";
  }

  return status === "active" ? "active" : "draft";
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
  beds: string;
  price: number;
  status: "active" | "maintenance" | "draft";
  description: string;
  uploads?: Array<{ url: string; path: string; fileName: string }>;
}) {
  const supabase = createSupabaseServiceClient();
  const slug = payload.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const active = payload.status === "active";

  const unitResult = payload.id
    ? await supabase
        .from("units")
        .update({
          name: payload.name,
          slug,
          short_description: payload.description,
          description: payload.description,
          max_guests: payload.capacity,
          beds: payload.beds,
          base_price_per_night: payload.price,
          active
        })
        .eq("id", payload.id)
        .select("id, name, max_guests, beds, base_price_per_night, short_description, active")
        .single()
    : await supabase
        .from("units")
        .insert({
          name: payload.name,
          slug,
          short_description: payload.description,
          description: payload.description,
          max_guests: payload.capacity,
          bedrooms: 1,
          beds: payload.beds,
          bathrooms: 1,
          base_price_per_night: payload.price,
          cleaning_fee: 0,
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
      base_price_per_night: payload.price,
      is_default: true,
      active
    }, { onConflict: "unit_id,code" });

  if (ratePlanSyncError) {
    throw ratePlanSyncError;
  }

  if (payload.uploads?.length) {
    const imageRows = payload.uploads.map((upload, index) => ({
      unit_id: unitResult.data.id,
      image_url: upload.url,
      storage_path: upload.path,
      alt_text: payload.name,
      sort_order: index + 1
    }));

    const { error: imageError } = await supabase.from("unit_images").insert(imageRows);

    if (imageError) {
      throw imageError;
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
    beds: unit.beds,
    price: unit.basePricePerNight,
    image: unit.featuredImage,
    images: unit.images.map((image) => ({
      id: image.id,
      url: image.imageUrl,
      altText: image.altText,
      sortOrder: image.sortOrder,
      storagePath: image.storagePath
    })),
    status: deriveReservationStatus(payload.status),
    description: unit.shortDescription
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
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  aboutTitle: string;
  aboutBody: string;
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
  contactEmail: string;
  phone: string;
  currency: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  address: string;
}) {
  const supabase = createSupabaseServiceClient();
  const settings = await fetchSiteSettings();
  const { error } = await supabase.from("site_settings").upsert([
    {
      key: "contact",
      value_json: {
        whatsappNumber: settings.whatsappNumber,
        phone: payload.phone,
        email: payload.contactEmail,
        instagramUrl: settings.instagramUrl,
        facebookUrl: settings.facebookUrl
      }
    },
    {
      key: "location",
      value_json: {
        address: payload.address,
        city: settings.city,
        region: settings.region,
        coordinates: settings.coordinates,
        googleMapsUrl: settings.googleMapsUrl
      }
    },
    {
      key: "general",
      value_json: {
        propertyName: payload.propertyName,
        currency: payload.currency,
        timezone: payload.timezone,
        checkInTime: payload.checkInTime,
        checkOutTime: payload.checkOutTime
      }
    }
  ], { onConflict: "key" });

  if (error) {
    throw error;
  }
}

export async function getGoogleHotelCenterFeedData() {
  if (canUseMockData()) {
    return {
      siteSettings: mockSiteSettings,
      units: mockUnits.filter((unit) => unit.active),
      ratePlans: [] as RatePlan[],
      inventory: [] as InventoryRecord[]
    };
  }

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
    .select("id, reservation_id")
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
}
