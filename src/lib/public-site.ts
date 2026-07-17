import type { SiteSettings, Unit } from "@/types/domain";

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
