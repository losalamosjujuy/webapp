export type AdminReservationStatus =
  | "pending_verification"
  | "verified_pending_payment"
  | "expired_verification"
  | "expired_hold"
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "canceled"
  | "completed"
  | "rejected"
  | "no_show";
export type AdminInquiryStatus = "new" | "in_progress" | "resolved";
export type AdminUnitStatus = "active" | "maintenance" | "draft";
export type AdminUserStatus = "active" | "inactive";
export type GalleryCategory = "inicio" | "alojamientos" | "servicios" | "entorno";
export type AdminPaymentStatus =
  | "pending"
  | "authorized"
  | "in_process"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back"
  | "expired";

export interface AdminManagedImage {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
  storagePath?: string;
}

export interface AdminReservation {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  accommodationId: string;
  accommodationName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: AdminReservationStatus;
  source: string;
  notes?: string;
}

export interface AdminGuest {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  reservationsCount: number;
  status: "frequent" | "new";
}

export interface AdminInquiry {
  id: string;
  createdAt: string;
  name: string;
  contact: string;
  channel: "WhatsApp" | "Email" | "Instagram" | "Web";
  subject: string;
  message: string;
  status: AdminInquiryStatus;
}

export interface AdminUnit {
  id: string;
  name: string;
  capacity: number;
  beds: string;
  price: number;
  image: string;
  images: AdminManagedImage[];
  status: AdminUnitStatus;
  description: string;
}

export interface AdminAvailabilityBlock {
  id: string;
  accommodationId: string;
  accommodationName: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdBy: string;
}

export interface AdminPriceSeason {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  prices: Record<string, number>;
}

export interface AdminPayment {
  id: string;
  reservationId: string;
  reservationCode: string;
  guestName: string;
  amount: number;
  currency: string;
  provider: string;
  status: AdminPaymentStatus;
  paidAt?: string;
  createdAt: string;
}

export interface AdminInventoryRecord {
  id: string;
  accommodationId: string;
  date: string;
  availableUnits: number;
  stopSell: boolean;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  minStay?: number;
  maxStay?: number;
  baseRate?: number;
}

export interface AdminGalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  image: string;
  storagePath?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Administrador" | "Editor" | "Recepción" | "Visualizador";
  status: AdminUserStatus;
  lastAccess: string;
}

export interface AdminFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface AdminPolicyItem {
  id: string;
  title: string;
  body: string;
}

export interface AdminSiteContent {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  aboutTitle: string;
  aboutBody: string;
  testimonialsTitle: string;
  locationTitle: string;
  policiesTitle: string;
  faqs: AdminFaqItem[];
  policies: AdminPolicyItem[];
}

export interface AdminSettings {
  propertyName: string;
  contactEmail: string;
  phone: string;
  currency: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  address: string;
}

export interface AdminState {
  reservations: AdminReservation[];
  payments: AdminPayment[];
  guests: AdminGuest[];
  inquiries: AdminInquiry[];
  units: AdminUnit[];
  inventory: AdminInventoryRecord[];
  availabilityBlocks: AdminAvailabilityBlock[];
  priceSeasons: AdminPriceSeason[];
  gallery: AdminGalleryItem[];
  users: AdminUser[];
  siteContent: AdminSiteContent;
  settings: AdminSettings;
}
