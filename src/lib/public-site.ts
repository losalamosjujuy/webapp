import { ADMIN_STORAGE_KEY } from "@/lib/admin-storage";
import type { AdminInquiry, AdminState } from "@/types/admin";
import type { Inquiry, SiteSettings, Unit } from "@/types/domain";

export const PUBLIC_INFO_MODAL_IDS = [
  "about",
  "policies",
  "faq",
  "terms"
] as const;

export type PublicInfoModalId = (typeof PUBLIC_INFO_MODAL_IDS)[number];

export function buildWhatsAppUrl({
  number,
  message
}: {
  number: string;
  message: string;
}) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppMessages(settings: SiteSettings, units: Unit[]) {
  const general = `Hola, quiero hacer una consulta sobre ${settings.city}.`;
  const availability = "Hola, quiero consultar disponibilidad para una estadía.";
  const unitById = Object.fromEntries(
    units.map((unit) => [
      unit.id,
      `Hola, quiero consultar disponibilidad y detalles de ${unit.name}.`
    ])
  );

  return {
    general,
    availability,
    unitById
  };
}

export function toAdminInquiry(inquiry: Inquiry): AdminInquiry {
  return {
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
    status: inquiry.status === "new" ? "new" : inquiry.status === "contacted" ? "in_progress" : "resolved"
  };
}

export function persistInquiryToAdminDemo(inquiry: Inquiry) {
  if (typeof window === "undefined") {
    return;
  }

  const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY);

  if (!stored) {
    return;
  }

  try {
    const parsed = JSON.parse(stored) as AdminState;
    const adminInquiry = toAdminInquiry(inquiry);
    const current = parsed.inquiries ?? [];
    const exists = current.some((item) => item.id === adminInquiry.id);

    const next: AdminState = {
      ...parsed,
      inquiries: exists ? current.map((item) => (item.id === adminInquiry.id ? adminInquiry : item)) : [adminInquiry, ...current]
    };

    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore malformed demo state
  }
}
