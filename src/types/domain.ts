export type ReservationStatus =
  | "pending_verification"
  | "verified_pending_payment"
  | "expired_verification"
  | "expired_hold"
  | "pending_payment"
  | "pending"
  | "confirmed"
  | "rejected"
  | "canceled"
  | "completed"
  | "no_show";

export type ReservationRequestStatus =
  | "pending_verification"
  | "verified"
  | "checkout_created"
  | "expired_verification"
  | "expired_hold"
  | "completed"
  | "canceled";
export type VerificationChannel = "email";
export type ReservationHoldStatus = "active" | "converted" | "released" | "expired";

export type BlockType = "maintenance" | "owner_use" | "manual_hold";
export type PaymentProvider = "mercado_pago";
export type PaymentStatus =
  | "pending"
  | "authorized"
  | "in_process"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back"
  | "expired";
export type RatePlanPricingMode = "per_night";
export type InventorySource = "system" | "manual" | "channel_sync";
export type ChannelType =
  | "google_hotel_center"
  | "booking_com"
  | "channel_manager"
  | "gds";
export type ChannelSyncDirection = "push" | "pull";
export type ChannelSyncStatus = "pending" | "processing" | "success" | "failed";

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: string;
}

export interface UnitImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  storagePath?: string;
}

export interface Unit {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  maxGuests: number;
  bedrooms: number;
  beds: string;
  bathrooms: number;
  basePricePerNight: number;
  cleaningFee: number;
  active: boolean;
  featuredImage: string;
  amenities: Amenity[];
  images: UnitImage[];
}

export interface Guest {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  city?: string;
  country?: string;
  notes?: string;
}

export interface Reservation {
  id: string;
  reservationCode: string;
  guest: Guest;
  unit: Pick<Unit, "id" | "name" | "slug">;
  source: string;
  status: ReservationStatus;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  totalAmount: number;
  currency: string;
  specialRequests?: string;
  estimatedArrivalTime?: string;
  adminNotes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  reservationId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  externalReference: string;
  checkoutUrl?: string;
  providerPreferenceId?: string;
  providerPaymentId?: string;
  providerMerchantOrderId?: string;
  paidAt?: string;
  rawPayload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityBlock {
  id: string;
  unitId: string;
  startDate: string;
  endDate: string;
  reason: string;
  blockType: BlockType;
}

export interface RatePlan {
  id: string;
  unitId: string;
  code: string;
  name: string;
  description?: string;
  currency: string;
  pricingMode: RatePlanPricingMode;
  basePricePerNight: number;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryRecord {
  id: string;
  unitId: string;
  ratePlanId?: string;
  date: string;
  availableUnits: number;
  stopSell: boolean;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  minStay?: number;
  maxStay?: number;
  baseRate?: number;
  source: InventorySource;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelConnection {
  id: string;
  type: ChannelType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelMapping {
  id: string;
  channelConnectionId: string;
  unitId: string;
  ratePlanId?: string;
  externalPropertyId: string;
  externalRoomTypeId?: string;
  externalRatePlanId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelSyncLog {
  id: string;
  channelConnectionId: string;
  direction: ChannelSyncDirection;
  status: ChannelSyncStatus;
  entityType: string;
  entityId?: string;
  externalReference?: string;
  message?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  message: string;
  checkIn?: string;
  checkOut?: string;
  guestsCount?: number;
  unitId?: string;
  source: string;
  status: "new" | "contacted" | "converted" | "closed";
  createdAt: string;
}

export interface Testimonial {
  id: string;
  guestName: string;
  quote: string;
  rating: number;
  source: string;
  active: boolean;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  storagePath?: string;
}

export interface SiteSettings {
  whatsappNumber: string;
  phone: string;
  email: string;
  instagramUrl: string;
  facebookUrl: string;
  googleReviewsUrl?: string;
  googleMapsUrl?: string;
  address: string;
  city: string;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface HeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  trustPoints: string[];
  imageUrl?: string;
}

export interface LandingContent {
  hero: HeroContent;
  about: string;
  policies: Array<{ title: string; body: string }>;
  faqs: Faq[];
  testimonials: Testimonial[];
}
