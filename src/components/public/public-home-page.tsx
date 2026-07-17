"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Calendar,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  CircleArrowUp,
  CookingPot,
  Facebook,
  FileSearch,
  HeartHandshake,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Mountain,
  Phone,
  Trees,
  User,
  UtensilsCrossed,
  Wifi,
  X
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAppFeedback } from "@/components/feedback/app-feedback-provider";
import { PublicReservationLookupPanel } from "@/components/public/public-reservation-lookup-panel";
import { Button } from "@/components/ui/button";
import { AccommodationModal } from "@/components/public/accommodation-modal";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { propertyImages } from "@/data/property-images";
import {
  buildWhatsAppMessages,
  buildWhatsAppUrl,
  type PublicInfoModalId
} from "@/lib/public-site";
import { buildPricingPreview } from "@/lib/pricing/pricing";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { resolvePublicImage } from "@/lib/utils/images";
import {
  inquirySchema,
  reservationRequestSchema
} from "@/lib/validations/reservation";
import type {
  GalleryItem,
  Inquiry,
  LandingContent,
  PublicReservationLookup,
  SiteSettings,
  Unit
} from "@/types/domain";

const SERVICE_ICONS = [Wifi, UtensilsCrossed, Mountain, Car, CookingPot, Trees, HeartHandshake];
const SERVICE_LABELS = [
  { title: "Wi-Fi", subtitle: "Conexión disponible en el hospedaje." },
  { title: "Desayuno", subtitle: "Consultanos si está incluido o si se ofrece aparte." },
  { title: "Calefacción", subtitle: "Disponible según el alojamiento." },
  { title: "Estacionamiento", subtitle: "Te confirmamos la modalidad antes de reservar." },
  { title: "Cocina", subtitle: "Privada, compartida o no disponible según la unidad." },
  { title: "Exterior", subtitle: "Espacios para descansar y disfrutar del entorno." },
  { title: "Atención", subtitle: "Comunicación directa antes y durante tu estadía." }
];

const NAV_ITEMS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Alojamientos", href: "#alojamientos" },
  { label: "Servicios", href: "#servicios" },
  { label: "Galería", href: "#galeria" },
  { label: "Ubicación", href: "#ubicacion" },
  { label: "Preguntas frecuentes", href: "#preguntas-frecuentes" }
];

const LOCATION_HIGHLIGHTS = [
  "Tilcara, Jujuy",
  "Base ideal para recorrer la Quebrada",
  "Indicaciones enviadas al confirmar tu reserva"
];

const EXACT_GOOGLE_MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.817950934423!2d-65.39391372391393!3d-23.574980962094184!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9404cb5d5f103405%3A0x3822d60e0a53519e!2sAlverro%20157%2C%20Y4624%20Tilcara%2C%20Jujuy!5e0!3m2!1ses-419!2sar!4v1783687185243!5m2!1ses-419!2sar";

const PLACEHOLDER_PHONES = new Set(["+54 9 388 123 4567", "5493881234567"]);
const PLACEHOLDER_EMAILS = new Set(["reservas@losalamostilcara.com"]);
const PLACEHOLDER_ADDRESSES = new Set(["Tilcara, Quebrada de Humahuaca"]);

function hasPublishedTestimonials(testimonials: LandingContent["testimonials"]) {
  return testimonials.some((item) => item.active && item.source !== "draft");
}

function isVisiblePhone(phone: string) {
  return Boolean(phone) && !PLACEHOLDER_PHONES.has(phone);
}

function isVisibleEmail(email: string) {
  return Boolean(email) && !PLACEHOLDER_EMAILS.has(email);
}

function isVisibleAddress(address: string) {
  return Boolean(address) && !PLACEHOLDER_ADDRESSES.has(address);
}

type AvailabilityResult = {
  units: Array<Pick<Unit, "id" | "name" | "shortDescription" | "fromPricePerNight" | "featuredImage" | "maxGuests">>;
};

type BookingPrefill = Partial<ReservationFormValues> & {
  unitId?: string;
};

const BOOKING_DRAFT_STORAGE_KEY = "los-alamos-booking-draft";

const EMPTY_BOOKING_DRAFT: BookingPrefill = {
  adults: 1,
  children: 0,
  checkIn: "",
  checkOut: "",
  unitId: "",
  fullName: "",
  phone: "",
  email: "",
  city: "",
  country: "",
  specialNotes: "",
  estimatedArrivalTime: ""
};

function normalizeBookingDraft(input?: BookingPrefill | null): BookingPrefill {
  return {
    ...EMPTY_BOOKING_DRAFT,
    ...input,
    adults: Number(input?.adults ?? EMPTY_BOOKING_DRAFT.adults),
    children: Number(input?.children ?? EMPTY_BOOKING_DRAFT.children)
  };
}

type ReservationFormValues = z.infer<typeof reservationRequestSchema>;
type InquiryFormValues = z.infer<typeof inquirySchema>;

const RESERVATION_STATUS_LABELS: Partial<Record<PublicReservationLookup["status"], string>> = {
  pending_verification: "Verificación pendiente",
  verified_pending_payment: "Pago pendiente",
  pending_payment: "Pago pendiente",
  confirmed: "Confirmada",
  canceled: "Cancelada",
  completed: "Completada"
};

const PAYMENT_STATUS_LABELS: Partial<Record<NonNullable<PublicReservationLookup["paymentStatus"]>, string>> = {
  pending: "Pendiente",
  authorized: "Autorizado",
  in_process: "En proceso",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reintegrado",
  charged_back: "Desconocido",
  expired: "Vencido"
};

function useModalBehavior(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
}

function getReservationStatusLabel(status: PublicReservationLookup["status"]) {
  return RESERVATION_STATUS_LABELS[status] ?? status;
}

function getPaymentStatusLabel(status?: PublicReservationLookup["paymentStatus"]) {
  if (!status) {
    return null;
  }

  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function PublicHomePage({
  gallery,
  landingContent,
  siteSettings,
  units
}: {
  gallery: GalleryItem[];
  landingContent: LandingContent;
  siteSettings: SiteSettings;
  units: Unit[];
}) {
  const { runBlockingAction } = useAppFeedback();
  const whatsappMessages = useMemo(() => buildWhatsAppMessages(siteSettings, units), [siteSettings, units]);
  const featuredUnits = units.slice(0, 3);
  const heroImage = resolvePublicImage(landingContent.hero.imageUrl ?? units[0]?.featuredImage, propertyImages.hero);
  const secondaryHeroImage = resolvePublicImage(
    units[1]?.featuredImage ?? units[0]?.images[0]?.imageUrl,
    heroImage
  );
  const galleryImages = useMemo(
    () =>
      gallery.length
        ? gallery.map((item) => ({
            id: item.id,
            src: resolvePublicImage(item.imageUrl, propertyImages.gallery),
            alt: item.title
          }))
        : units.flatMap((unit) =>
            unit.images.map((image) => ({
              id: image.id,
              src: resolvePublicImage(image.imageUrl, unit.featuredImage || propertyImages.gallery),
              alt: image.altText || unit.name
            }))
          ),
    [gallery, units]
  );
  const testimonials = landingContent.testimonials
    .filter((item) => item.active && item.source !== "draft")
    .map((item) => ({
        quote: item.quote,
        author: item.guestName
      }));
  const reservationLookupWhatsappMessage =
    "Hola, necesito ayuda para consultar el estado de mi reserva.";
  const showPublishedTestimonials = hasPublishedTestimonials(landingContent.testimonials);
  const showPhone = isVisiblePhone(siteSettings.phone);
  const showEmail = isVisibleEmail(siteSettings.email);
  const showAddress = isVisibleAddress(siteSettings.address);

  function scrollToAvailability() {
    const section = document.getElementById("consultar-disponibilidad");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const [activeInfoModal, setActiveInfoModal] = useState<PublicInfoModalId | null>(null);
  const [selectedAccommodationUnitId, setSelectedAccommodationUnitId] = useState<string | null>(null);
  const [bookingModalUnitId, setBookingModalUnitId] = useState<string | undefined>();
  const [bookingDraft, setBookingDraft] = useState<BookingPrefill>(EMPTY_BOOKING_DRAFT);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [reservationLookupModalOpen, setReservationLookupModalOpen] = useState(false);
  const [availabilityResults, setAvailabilityResults] = useState<AvailabilityResult | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [searchForm, setSearchForm] = useState({
    checkIn: EMPTY_BOOKING_DRAFT.checkIn ?? "",
    checkOut: EMPTY_BOOKING_DRAFT.checkOut ?? "",
    guests: String(EMPTY_BOOKING_DRAFT.adults ?? 1),
    unitId: ""
  });
  const selectedAccommodationUnit = units.find((unit) => unit.id === selectedAccommodationUnitId) ?? null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = normalizeBookingDraft(JSON.parse(raw) as BookingPrefill);
      setBookingDraft(parsed);
      setSearchForm({
        checkIn: parsed.checkIn ?? "",
        checkOut: parsed.checkOut ?? "",
        guests: String(parsed.adults ?? 1),
        unitId: parsed.unitId ?? ""
      });
      setBookingModalUnitId(parsed.unitId || undefined);
    } catch {
      window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(normalizeBookingDraft(bookingDraft)));
  }, [bookingDraft]);

  useEffect(() => {
    setSearchForm((current) => ({
      ...current,
      checkIn: bookingDraft.checkIn ?? "",
      checkOut: bookingDraft.checkOut ?? "",
      guests: String(bookingDraft.adults ?? current.guests ?? "1"),
      unitId: bookingDraft.unitId ?? ""
    }));
  }, [bookingDraft.adults, bookingDraft.checkIn, bookingDraft.checkOut, bookingDraft.unitId]);

  async function handleAvailabilitySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAvailabilityError(null);
    setAvailabilityResults(null);

    if (!searchForm.checkIn || !searchForm.checkOut) {
      setAvailabilityError("Selecciona check-in y check-out para consultar.");
      return;
    }

    if (searchForm.checkIn >= searchForm.checkOut) {
      setAvailabilityError("La fecha de salida debe ser posterior al check-in.");
      return;
    }

    try {
      const data = await runBlockingAction(
        async () => {
          const response = await fetch("/api/availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...searchForm,
              guests: Number(searchForm.guests),
              unitId: searchForm.unitId || undefined
            })
          });

          const payload = (await response.json().catch(() => null)) as
            | (AvailabilityResult & { error?: string })
            | null;

          if (!response.ok || !payload) {
            throw new Error(payload?.error ?? "No pudimos consultar disponibilidad.");
          }

          return payload;
        },
        {
          loadingMessage: "Estamos consultando la disponibilidad de los alojamientos.",
          successMessage: (payload) =>
            payload.units.length
              ? "La disponibilidad se actualizo correctamente."
              : "No encontramos opciones exactas para ese rango."
        }
      );

      setAvailabilityResults(data);
    } catch (error) {
      setAvailabilityError(
        error instanceof Error
          ? error.message
          : "No pudimos consultar disponibilidad. Intenta nuevamente."
      );
    }
  }

  function openBookingModal(unitId?: string) {
    setBookingDraft((current) =>
      normalizeBookingDraft({
        ...current,
        checkIn: searchForm.checkIn || current.checkIn,
        checkOut: searchForm.checkOut || current.checkOut,
        adults: Number(searchForm.guests || String(current.adults ?? 1)),
        unitId: unitId ?? searchForm.unitId ?? current.unitId
      })
    );
    setBookingModalUnitId(unitId);
    setBookingModalOpen(true);
  }

  function openAccommodationModal(unitId: string) {
    setSelectedAccommodationUnitId(unitId);
  }

  return (
    <main id="top" className="bg-[#fbf7f1] text-[#2d221a]">
      <section id="inicio" className="relative overflow-hidden bg-[#201a12] text-white">
        <div className="absolute inset-0">
          <Image alt="Los Álamos Tilcara" fill priority src={heroImage} className="object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,14,11,0.88)_0%,rgba(18,14,11,0.72)_36%,rgba(18,14,11,0.24)_62%,rgba(18,14,11,0.08)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,15,11,0.72)_0%,rgba(20,15,11,0.16)_28%,rgba(20,15,11,0.08)_72%,rgba(20,15,11,0.32)_100%)]" />
        </div>

        <div className="relative z-10">
          <div className="border-b border-white/10 bg-[#2a241b]/94">
            <div className="mx-auto flex max-w-[1728px] flex-col gap-2 px-4 py-3 text-[12px] text-white/88 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p>Hospedaje en Tilcara, Jujuy</p>
              <div className="flex flex-wrap items-center gap-5">
                <p className="inline-flex items-center gap-2 whitespace-nowrap">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Atención directa por WhatsApp
                </p>
                <a
                  href={buildWhatsAppUrl({
                    number: siteSettings.whatsappNumber,
                    message: whatsappMessages.availability
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Consultar disponibilidad
                </a>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1728px] px-4 sm:px-8">
            <header className="flex flex-col gap-5 py-5 xl:flex-row xl:items-center xl:justify-between xl:py-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d7c2a5]/45 bg-white/5 sm:h-[70px] sm:w-[70px]">
                  <Trees className="h-7 w-7 text-[#ece0cb] sm:h-8 sm:w-8" strokeWidth={1.4} />
                </div>
                <div>
                  <p className="font-display text-[34px] leading-none tracking-[-0.05em] text-[#fffaf4] sm:text-[44px]">Los Álamos</p>
                  <p className="mt-1 pl-1 text-[10px] uppercase tracking-[0.48em] text-white/70">Tilcara</p>
                </div>
              </div>

              <nav className="hidden items-center gap-10 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/90 xl:flex">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.label} href={item.href} className="transition hover:text-[#f0dcc0]">
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button
                onClick={scrollToAvailability}
                className="inline-flex h-14 w-full items-center justify-center rounded-[22px] border border-[#b8a27f] bg-[#35311f] px-6 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(12,10,7,0.16)] sm:h-[64px] sm:w-auto sm:rounded-[26px] sm:px-9 sm:text-[12px]"
              >
                <CalendarDays className="mr-3 h-4 w-4" />
                Consultar fechas
              </button>
            </header>

            <div className="min-h-[700px] pt-8 pb-24 sm:min-h-[860px] sm:pt-12 sm:pb-36">
              <div className="max-w-[630px] pt-10 sm:pt-16">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.22em] text-[#f2ead9] sm:text-[13px]">
                  HOSPEDAJE EN TILCARA, JUJUY
                </p>
                <h1 className="mt-5 font-display text-[54px] leading-[0.92] tracking-[-0.06em] text-[#fff9f3] sm:text-[92px]">
                  Descansá en Tilcara y viví la Quebrada a tu ritmo
                </h1>
                <p className="mt-6 max-w-[560px] text-[17px] leading-[1.65] text-white/90 sm:mt-8 sm:text-[20px] sm:leading-[1.72]">
                  Un lugar tranquilo para descansar después de recorrer los paisajes, pueblos y caminos de la Quebrada de Humahuaca.
                </p>

                <div className="mt-8 grid gap-3 md:grid-cols-3 sm:mt-11">
                  {["Atención directa", "Ubicación en Tilcara", "Reserva simple y personalizada"].map((point, index) => {
                    const Icon = index === 0 ? CalendarDays : index === 1 ? HeartHandshake : MapPin;
                    const subtitle =
                      index === 0
                        ? "Comunicación clara desde el primer mensaje"
                        : index === 1
                          ? "Base ideal para recorrer la Quebrada"
                          : "Te guiamos según tus fechas y cantidad de huéspedes";

                    return (
                      <div
                        key={point}
                        className="rounded-[18px] border border-white/18 bg-white/[0.07] px-5 py-5 backdrop-blur-[1.5px]"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-[#f2ddbf]" strokeWidth={1.7} />
                          <p className="text-[15px] font-semibold text-white">{point}</p>
                        </div>
                        <p className="mt-2.5 text-[12px] text-white/72">{subtitle}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 grid gap-3 sm:mt-9 sm:flex sm:flex-wrap sm:gap-4">
                  <button
                    onClick={scrollToAvailability}
                    className="inline-flex h-[54px] items-center justify-center rounded-[20px] border border-[#b2a071] bg-[#37341f] px-6 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white sm:h-[58px] sm:rounded-[24px] sm:px-8 sm:text-[13px]"
                  >
                    <CalendarDays className="mr-3 h-4 w-4" />
                    Consultar disponibilidad
                  </button>
                  <a
                    href="#alojamientos"
                    className="inline-flex h-[54px] items-center justify-center rounded-[20px] border border-white/35 bg-white/[0.06] px-6 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white sm:h-[58px] sm:rounded-[24px] sm:px-8 sm:text-[13px]"
                  >
                    <ChevronRight className="mr-3 h-4 w-4" />
                    Conocer los alojamientos
                  </a>
                </div>

                <p className="mt-6 max-w-[600px] text-[14px] leading-7 text-white/78 sm:text-[15px]">
                  Contanos cuándo viajás y cuántas personas son. Te responderemos con las opciones disponibles y el precio total de la estadía.
                </p>
              </div>
            </div>

            <section className="hidden">
              <div>
                <h2 className="font-display text-[32px] leading-none tracking-[-0.055em] text-[#2b2118] sm:text-[40px] lg:text-[42px]">
                  {"\u00BFCu\u00E1ndo quer\u00E9s venir?"}
                </h2>
                <p className="mt-3 text-[15px] text-[#78675a] sm:text-[16px]">
                  {"Consult\u00E1 disponibilidad sin compromiso. Te respondemos a la brevedad."}
                </p>
              </div>

              <form onSubmit={handleAvailabilitySubmit} className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_236px] xl:items-stretch">
                <DateRangePicker
                  checkIn={searchForm.checkIn}
                  checkOut={searchForm.checkOut}
                  className="xl:col-span-2"
                  onChange={({ checkIn, checkOut }) => {
                    setSearchForm((current) => ({ ...current, checkIn, checkOut }));
                    setBookingDraft((current) => normalizeBookingDraft({ ...current, checkIn, checkOut }));
                  }}
                />
                <BookingField
                  label={"Hu\u00E9spedes"}
                  value={searchForm.guests}
                  icon={User}
                  onChange={(value) => {
                    setSearchForm((current) => ({ ...current, guests: value }));
                    setBookingDraft((current) => normalizeBookingDraft({ ...current, adults: Number(value || "1") }));
                  }}
                  type="number"
                  min={1}
                  placeholder={"1 hu\u00E9sped"}
                />
                <SelectBookingField
                  label="Alojamiento"
                  value={searchForm.unitId}
                  onChange={(value) => {
                    setSearchForm((current) => ({ ...current, unitId: value }));
                    setBookingDraft((current) => normalizeBookingDraft({ ...current, unitId: value }));
                  }}
                  options={[
                    { value: "", label: "Cualquiera" },
                    ...units.map((unit) => ({ value: unit.id, label: unit.name }))
                  ]}
                />
                <button
                  type="submit"
                  className="inline-flex h-[68px] items-center justify-center rounded-[16px] bg-[#39361f] px-6 text-[13px] font-extrabold uppercase tracking-[0.08em] text-white sm:h-[74px] sm:text-[14px]"
                >
                  Ver disponibilidad
                </button>
              </form>

              {availabilityError ? <p className="mt-4 text-sm font-medium text-red-700">{availabilityError}</p> : null}

              {availabilityResults ? (
                <div className="mt-6 rounded-[24px] border border-[#eadfd2] bg-[#fcfaf7] p-5">
                  <div className="flex flex-col gap-4">
                    {availabilityResults.units.length ? (
                      availabilityResults.units.map((unit) => (
                        <div
                          key={unit.id}
                          className="flex flex-col gap-4 rounded-[18px] border border-[#e7dbcf] bg-white p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative h-[92px] w-[120px] overflow-hidden rounded-[14px] border border-[#eadfd3] bg-[#f2ebe3]">
                              <Image
                                alt={unit.name}
                                fill
                                src={resolvePublicImage(unit.featuredImage, propertyImages.roomDouble)}
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-[#2a2019]">{unit.name}</p>
                              <p className="mt-1.5 text-sm text-[#6f6054]">{unit.shortDescription}</p>
                              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[#8d725f]">
                                Hasta {unit.maxGuests} huéspedes
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-3 md:items-end">
                            <p className="text-sm font-semibold text-[#9f5e2f]">
                              Desde {formatCurrency(unit.fromPricePerNight, "ARS")} / noche
                            </p>
                            <button
                              onClick={() => openBookingModal(unit.id)}
                              type="button"
                              className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#cfae92] px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#8d5222]"
                            >
                              Solicitar reserva
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[18px] border border-[#e8ddd2] bg-white p-5">
                        <p className="text-sm text-[#6f6054]">
                          {"No encontramos disponibilidad exacta para ese rango. Igualmente pod\u00E9s enviar una solicitud y revisamos alternativas manualmente."}
                        </p>
                        <button
                          onClick={() => openBookingModal(searchForm.unitId || undefined)}
                          type="button"
                          className="mt-4 inline-flex h-11 items-center justify-center rounded-[14px] bg-[#9f5e2f] px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-white"
                        >
                          Enviar solicitud
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </section>

      <div className="relative z-30 mx-auto -mt-4 max-w-[1728px] px-4 sm:-mt-14 sm:px-8 xl:-mt-12">
        <section
          id="consultar-disponibilidad"
          className="rounded-[28px] border border-[#efe2d3] bg-[#fcfbf8] px-4 pb-6 pt-6 shadow-[0_18px_38px_rgba(108,79,48,0.08),0_38px_90px_rgba(108,79,48,0.12)] sm:rounded-[34px] sm:px-8 sm:pb-8 sm:pt-7"
        >
          <div>
            <h2 className="font-display text-[32px] leading-none tracking-[-0.055em] text-[#2b2118] sm:text-[40px] lg:text-[42px]">
              ¿Cuándo querés venir?
            </h2>
            <p className="mt-3 text-[15px] text-[#78675a] sm:text-[16px]">
              Completá los datos de tu viaje para conocer las opciones disponibles.
            </p>
          </div>

          <form onSubmit={handleAvailabilitySubmit} className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_236px] xl:items-end">
            <DateRangePicker
              checkIn={searchForm.checkIn}
              checkOut={searchForm.checkOut}
              className="xl:col-span-2"
              onChange={({ checkIn, checkOut }) => {
                setSearchForm((current) => ({ ...current, checkIn, checkOut }));
                setBookingDraft((current) => normalizeBookingDraft({ ...current, checkIn, checkOut }));
              }}
            />
            <BookingField
              label={"Huéspedes"}
              value={searchForm.guests}
              icon={User}
              onChange={(value) => {
                setSearchForm((current) => ({ ...current, guests: value }));
                setBookingDraft((current) => normalizeBookingDraft({ ...current, adults: Number(value || "1") }));
              }}
                  type="number"
                  min={1}
                  placeholder={"1 huésped"}
                />
            <SelectBookingField
              label="Tipo de alojamiento"
              value={searchForm.unitId}
              onChange={(value) => {
                setSearchForm((current) => ({ ...current, unitId: value }));
                setBookingDraft((current) => normalizeBookingDraft({ ...current, unitId: value }));
              }}
              options={[
                { value: "", label: "Cualquier opción" },
                ...units.map((unit) => ({ value: unit.id, label: unit.name }))
              ]}
            />
            <button
              type="submit"
              className="inline-flex h-[68px] w-full items-center justify-center self-stretch rounded-[16px] bg-[#39361f] px-6 text-[13px] font-extrabold uppercase tracking-[0.08em] text-white sm:h-[74px] sm:text-[14px] xl:self-auto"
            >
              Solicitar disponibilidad
            </button>
          </form>

          {availabilityError ? <p className="mt-4 text-sm font-medium text-red-700">{availabilityError}</p> : null}
          <p className="mt-4 text-sm text-[#78675a]">
            Consultar no tiene costo y no confirma automáticamente la reserva.
          </p>

          {availabilityResults ? (
            <div className="mt-6 rounded-[24px] border border-[#eadfd2] bg-[#fcfaf7] p-5">
              <div className="flex flex-col gap-4">
                {availabilityResults.units.length ? (
                  availabilityResults.units.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex flex-col gap-4 rounded-[18px] border border-[#e7dbcf] bg-white p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative h-[92px] w-[120px] overflow-hidden rounded-[14px] border border-[#eadfd3] bg-[#f2ebe3]">
                          <Image
                            alt={unit.name}
                            fill
                            src={resolvePublicImage(unit.featuredImage, propertyImages.roomDouble)}
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#2a2019]">{unit.name}</p>
                          <p className="mt-1.5 text-sm text-[#6f6054]">{unit.shortDescription}</p>
                          <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[#8d725f]">
                            Hasta {unit.maxGuests} huéspedes
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <p className="text-sm font-semibold text-[#9f5e2f]">
                          Desde {formatCurrency(unit.fromPricePerNight, "ARS")} / noche
                        </p>
                        <button
                          onClick={() => openBookingModal(unit.id)}
                          type="button"
                          className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#cfae92] px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#8d5222]"
                        >
                          Solicitar reserva
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-[#e8ddd2] bg-white p-5">
                    <p className="text-sm text-[#6f6054]">
                      {"No encontramos disponibilidad exacta para ese rango. Igualmente pod\u00E9s enviar una solicitud y revisamos alternativas manualmente."}
                    </p>
                    <button
                      onClick={() => openBookingModal(searchForm.unitId || undefined)}
                      className="mt-4 inline-flex h-11 items-center justify-center rounded-[14px] bg-[#9f5e2f] px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-white"
                    >
                      Solicitar reserva
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <section id="alojamientos" className="mx-auto grid max-w-[1728px] gap-10 px-4 pb-20 pt-24 sm:px-8 sm:pb-24 sm:pt-28 xl:grid-cols-[312px_1fr]">
        <aside className="pt-4">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Nuestros alojamientos</p>
          <h2 className="mt-5 font-display text-[52px] leading-[1.04] tracking-[-0.06em] text-[#2b2118] sm:text-[58px]">
            Encontrá el espacio adecuado para tu viaje
          </h2>
          <p className="mt-7 max-w-[270px] text-[18px] leading-[1.85] text-[#78685b]">
            Conocé la capacidad, distribución, servicios y fotografías reales de cada opción antes de reservar.
          </p>
          <a href="#contacto-directo" className="mt-8 inline-flex h-[50px] items-center justify-center rounded-[12px] border border-[#d7b18e] px-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9a5d2e] sm:mt-10 sm:h-[54px] sm:px-8 sm:text-[12px]">
            Recibir asesoramiento
          </a>
          <p className="mt-6 max-w-[270px] text-[15px] leading-7 text-[#78685b]">
            ¿No sabés cuál elegir? Contanos cuántas personas viajan y te ayudaremos a encontrar la opción más conveniente.
          </p>
        </aside>

        <div className="grid gap-5 xl:grid-cols-3">
          {featuredUnits.map((unit) => (
            <article key={unit.id} className="overflow-hidden rounded-[22px] border border-[#eadfd2] bg-white shadow-[0_12px_40px_rgba(91,69,42,0.07)]">
              <div className="relative aspect-[1.12]">
                <Image
                  alt={unit.name}
                  fill
                  src={resolvePublicImage(unit.featuredImage, propertyImages.roomDouble)}
                  className="object-cover"
                />
              </div>
              <div className="px-5 pb-6 pt-4">
                <h3 className="font-display text-[35px] leading-none tracking-[-0.05em] text-[#2b2118]">{unit.name}</h3>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[#8a715f]">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Hasta {unit.maxGuests} huéspedes
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" />
                    {unit.beds}
                  </span>
                </div>
                <p className="mt-4 text-[15px] leading-8 text-[#6c5b50]">{unit.shortDescription}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openAccommodationModal(unit.id)}
                    className="inline-flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#ae6a35]"
                  >
                    Ver alojamiento
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={scrollToAvailability}
                    className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#d7b18e] px-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9a5d2e]"
                    type="button"
                  >
                    Consultar disponibilidad
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="servicios" className="border-y border-[#efe3d7] bg-[#fbf7f1]">
        <div className="mx-auto grid max-w-[1728px] gap-8 px-4 py-16 sm:px-8 xl:grid-cols-[360px_1fr]">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Servicios</p>
            <h2 className="mt-5 font-display text-[48px] leading-[1.08] tracking-[-0.06em] text-[#2b2118] sm:text-[54px]">
              Todo claro antes de reservar
            </h2>
            <p className="mt-6 max-w-[300px] text-[17px] leading-[1.85] text-[#7c6b5d]">
              Queremos que sepas exactamente qué incluye tu estadía. Si necesitás confirmar algún servicio, escribinos antes de realizar la reserva.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 xl:grid-cols-7">
            {SERVICE_LABELS.map((service, index) => {
              const Icon = SERVICE_ICONS[index];

              return (
                <div key={service.title} className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center text-[#a36435]">
                    <Icon className="h-8 w-8" strokeWidth={1.7} />
                  </div>
                  <p className="mt-3 text-[16px] font-semibold text-[#2f251d]">{service.title}</p>
                  <p className="mt-1 text-[13px] leading-6 text-[#79695d]">{service.subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="relative overflow-hidden bg-[#f7f2eb]">
        {/* Decoración de fondo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-[#d9b894]/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-[1728px] px-4 py-20 sm:px-8 md:py-28 lg:py-36">
          <div className="grid items-end gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:gap-24">
            {/* Contenido principal */}
            <div className="max-w-[900px]">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9a5d2e] sm:text-[12px]">
                Atención personalizada
              </p>

              <h2 className="mt-6 max-w-[860px] font-display text-[44px] leading-[0.98] tracking-[-0.045em] text-[#2b2118] sm:text-[58px] md:text-[72px] lg:text-[84px]">
                Tu estadía en Tilcara empieza mucho antes de llegar.
              </h2>

              <p className="mt-8 max-w-[700px] text-[17px] leading-8 text-[#6c5b50] sm:text-[19px]">
                Contanos cuándo querés viajar, cuántas personas son y qué tipo de
                estadía estás buscando. Te ayudamos a consultar disponibilidad,
                elegir la opción más conveniente y resolver todo antes de tu llegada.
              </p>

              <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <a
                  href={buildWhatsAppUrl({
                    number: siteSettings.whatsappNumber,
                    message: whatsappMessages.general
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-[#201812] px-7 text-[13px] font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#9a5d2e]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.4A8.4 8.4 0 1 1 20.5 11.7Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.6 7.9c.2-.4.4-.4.7-.4h.4c.2 0 .4 0 .5.4l.7 1.7c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4-.1.6.4.8 1 1.5 1.7 2 .7.5 1.4.8 2.2 1 .3.1.5 0 .7-.2l.8-1c.2-.2.4-.3.7-.2l1.7.8c.3.1.5.3.5.5 0 .3-.1 1.4-.7 1.9-.6.6-1.5.9-2.4.8-1.1-.1-2.5-.5-4.2-1.5-2.3-1.4-3.8-3.4-4.2-4-.4-.6-1.1-1.9-1.1-3.2 0-1.2.6-2.1 1-2.6Z"
                      fill="currentColor"
                    />
                  </svg>

                  Consultar disponibilidad

                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path
                      d="M4 10h12M11.5 5.5 16 10l-4.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>

                <p className="text-[13px] leading-5 text-[#7b6b60]">
                  Te respondemos personalmente por WhatsApp.
                </p>
              </div>
            </div>

            {/* Información de confianza */}
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <p className="font-display text-[34px] leading-none tracking-[-0.04em] text-[#2b2118]">
                  Atención directa
                </p>
                <p className="mt-3 max-w-[360px] text-[15px] leading-7 text-[#75655a]">
                  Sin respuestas automáticas ni procesos complicados. Hablás
                  directamente con el equipo de Los Álamos.
                </p>
              </div>

              <div>
                <p className="font-display text-[34px] leading-none tracking-[-0.04em] text-[#2b2118]">
                  Todo claro antes de viajar
                </p>
                <p className="mt-3 max-w-[360px] text-[15px] leading-7 text-[#75655a]">
                  Consultá fechas, habitaciones, servicios, estacionamiento y cualquier
                  detalle importante para tu estadía.
                </p>
              </div>

              <div>
                <p className="font-display text-[34px] leading-none tracking-[-0.04em] text-[#2b2118]">
                  Recomendaciones locales
                </p>
                <p className="mt-3 max-w-[360px] text-[15px] leading-7 text-[#75655a]">
                  También podemos orientarte sobre lugares para visitar y experiencias
                  para aprovechar mejor tu paso por Tilcara.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="galeria" className="mx-auto grid max-w-[1728px] gap-10 px-4 py-16 sm:px-8 sm:py-20 xl:grid-cols-[312px_1fr]">
        <aside className="pt-3">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Galería</p>
          <h2 className="mt-5 font-display text-[48px] leading-[1.08] tracking-[-0.06em] text-[#2b2118] sm:text-[52px]">
            Conocé Los Álamos antes de llegar
          </h2>
          <p className="mt-6 max-w-[260px] text-[17px] leading-[1.85] text-[#7c6b5d]">
            Recorré las habitaciones, los espacios comunes y el exterior a través de fotografías reales del hospedaje.
          </p>
          <button className="mt-10 inline-flex h-[52px] items-center justify-center rounded-[12px] border border-[#d7b18e] px-8 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#9a5d2e]">
            Ver todas las fotos
          </button>
        </aside>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {galleryImages.slice(0, 4).map((image, index) => (
            <div key={image.id} className="group relative overflow-hidden rounded-[20px]">
              <div className="relative aspect-[0.88]">
                <Image alt={image.alt} fill src={image.src} className="object-cover transition duration-500 group-hover:scale-[1.03]" />
              </div>
              {index === 3 ? (
                <div className="absolute right-4 top-4 flex gap-2">
                  <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#5d4b3f]">
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#5d4b3f]">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="hidden border-t border-[#efe3d7]">
        <div className="mx-auto max-w-[1728px] px-4 py-16 sm:px-8">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">{"Lo que dicen nuestros hu\u00E9spedes"}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {testimonials.slice(0, 3).map((item) => (
                <article key={item.author} className="rounded-[16px] border border-[#ece0d4] bg-white p-5 shadow-[0_8px_30px_rgba(91,69,42,0.04)]">
                  <div className="flex gap-1 text-[#d88d2f]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span key={index} className="text-[15px]">â˜…</span>
                    ))}
                  </div>
                  <p className="mt-4 text-[14px] leading-8 text-[#655549]">â€œ{item.quote}â€</p>
                  <p className="mt-6 text-[14px] font-semibold text-[#2b2118]">{item.author}</p>
                </article>
              ))}
            </div>
            <a
              href={siteSettings.googleReviewsUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#5e5849]"
            >
              <span className="text-[24px] font-black text-[#4285f4]">G</span>
              {"Ver m\u00E1s rese\u00F1as en Google"}
            </a>
          </div>

          <div id="ubicacion" className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="pt-1">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">{"Ubicaci\u00F3n"}</p>
              <h2 className="mt-5 font-display text-[46px] leading-[1.04] tracking-[-0.06em] text-[#2b2118] sm:text-[50px]">
                {"En el coraz\u00F3n de Tilcara"}
              </h2>
              <p className="mt-6 text-[16px] leading-8 text-[#6d5d4f]">
                A pocos minutos del centro y de los principales atractivos de la Quebrada de Humahuaca.
              </p>
              <div className="mt-7 space-y-4">
                {LOCATION_HIGHLIGHTS.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-[15px] text-[#6a5a4b]">
                    <MapPin className="h-4 w-4 text-[#ad6b38]" />
                    {item}
                  </div>
                ))}
              </div>
              <a
                href={siteSettings.googleMapsUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex h-[50px] items-center justify-center rounded-[10px] bg-[#ab6938] px-7 text-[12px] font-extrabold uppercase tracking-[0.14em] text-white"
              >
                {"C\u00F3mo llegar"}
              </a>
            </div>
            <div className="overflow-hidden rounded-[18px] border border-[#eadfd3] bg-[#eef1e8]">
              <iframe
                title="Mapa Los Álamos Tilcara"
                src={EXACT_GOOGLE_MAPS_EMBED_URL}
                className="h-[390px] w-full border-0"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="hidden mx-auto max-w-[1728px] px-4 pb-14 sm:px-8">
        <div className="flex flex-col gap-6 rounded-[24px] bg-[linear-gradient(90deg,#3b3925_0%,#2f2d1d_100%)] px-6 py-8 text-white shadow-[0_20px_60px_rgba(31,27,18,0.18)] lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-[16px] border border-white/20 bg-white/5">
              <CalendarDays className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-display text-[40px] leading-none tracking-[-0.05em] text-[#fff8ef] sm:text-[45px]">
                {"\u00BFListo para tu pr\u00F3xima escapada?"}
              </h3>
              <p className="mt-3 text-[16px] text-white/82">{"Consult\u00E1 disponibilidad y reserv\u00E1 directo con nosotros."}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button
              onClick={() => openBookingModal()}
              className="inline-flex h-[54px] items-center justify-center rounded-[10px] border border-white/30 px-7 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white"
            >
              <CalendarDays className="mr-3 h-4 w-4" />
              Consultar disponibilidad
            </button>
            <a
              href={buildWhatsAppUrl({
                number: siteSettings.whatsappNumber,
                message: whatsappMessages.availability
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[54px] items-center justify-center rounded-[10px] border border-white/30 px-7 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white"
            >
              <MessageCircle className="mr-3 h-4 w-4" />
              Escribir por WhatsApp
            </a>
            <button
              onClick={() => setReservationLookupModalOpen(true)}
              className="inline-flex h-[54px] items-center justify-center rounded-[10px] border border-white/30 px-7 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white"
              type="button"
            >
              <FileSearch className="mr-3 h-4 w-4" />
              Consultar mi reserva
            </button>
          </div>
        </div>
      </section>

      <section className="border-t border-[#efe3d7]">
        <div className="mx-auto max-w-[1728px] px-4 py-16 sm:px-8">
          {showPublishedTestimonials ? (
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.slice(0, 3).map((item) => (
                <article key={item.author} className="rounded-[16px] border border-[#ece0d4] bg-white p-5 shadow-[0_8px_30px_rgba(91,69,42,0.04)]">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Experiencias reales</p>
                  <p className="mt-4 text-[14px] leading-8 text-[#655549]">{`"${item.quote}"`}</p>
                  <p className="mt-6 text-[14px] font-semibold text-[#2b2118]">{item.author}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-[#eadfd2] bg-white px-6 py-8 shadow-[0_8px_30px_rgba(91,69,42,0.04)]">
              <h3 className="font-display text-[38px] leading-none tracking-[-0.05em] text-[#2b2118]">
                ¿Ya te hospedaste en Los Álamos?
              </h3>
              <p className="mt-4 max-w-[680px] text-[16px] leading-8 text-[#655549]">
                Tu opinión puede ayudar a otros viajeros a organizar su estadía en Tilcara.
              </p>
              {siteSettings.googleReviewsUrl ? (
                <a
                  href={siteSettings.googleReviewsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex h-[50px] items-center justify-center rounded-[12px] border border-[#d7b18e] px-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9a5d2e]"
                >
                  Dejar una reseña en Google
                </a>
              ) : null}
            </div>
          )}
        </div>
      </section>
      <section id="ubicacion" className="mx-auto grid max-w-[1728px] gap-5 px-4 py-16 sm:px-8 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="pt-1">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Ubicación</p>
          <h2 className="mt-5 font-display text-[46px] leading-[1.04] tracking-[-0.06em] text-[#2b2118] sm:text-[50px]">
            Hospedate en Tilcara y recorré la Quebrada
          </h2>
          <p className="mt-6 text-[16px] leading-8 text-[#6d5d4f]">
            Los Álamos se encuentra en Tilcara, Jujuy. Desde aquí podés organizar visitas al centro de Tilcara y a diferentes atractivos de la Quebrada de Humahuaca.
          </p>
          <p className="mt-4 text-[15px] leading-7 text-[#6d5d4f]">
            Después de confirmar tu reserva te enviaremos la ubicación exacta y las indicaciones de llegada.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {siteSettings.googleMapsUrl ? (
              <a
                href={siteSettings.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[50px] items-center justify-center rounded-[10px] bg-[#ab6938] px-7 text-[12px] font-extrabold uppercase tracking-[0.14em] text-white"
              >
                Abrir en Google Maps
              </a>
            ) : null}
            <a
              href={buildWhatsAppUrl({
                number: siteSettings.whatsappNumber,
                message: "Hola, quiero consultar cómo llegar a Los Álamos Tilcara."
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[50px] items-center justify-center rounded-[10px] border border-[#d7b18e] px-7 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#9a5d2e]"
            >
              Consultar cómo llegar
            </a>
          </div>
        </div>
        <div className="overflow-hidden rounded-[18px] border border-[#eadfd3] bg-[#eef1e8]">
          <iframe
            title="Mapa Los Álamos Tilcara"
            src={EXACT_GOOGLE_MAPS_EMBED_URL}
            className="h-[390px] w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </section>

      <section id="preguntas-frecuentes" className="mx-auto max-w-[1728px] px-4 py-4 sm:px-8">
        <div className="rounded-[24px] border border-[#eadfd2] bg-white px-6 py-8 shadow-[0_8px_30px_rgba(91,69,42,0.04)] sm:px-8">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Preguntas frecuentes</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {landingContent.faqs.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-[16px] border border-[#ece0d4] bg-[#fbf8f3] px-5 py-5">
                <h3 className="text-[16px] font-semibold text-[#2b2118]">{item.question}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#655549]">{item.answer}</p>
              </article>
            ))}
          </div>
          <button
            className="mt-6 inline-flex h-[50px] items-center justify-center rounded-[12px] border border-[#d7b18e] px-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9a5d2e]"
            onClick={() => setActiveInfoModal("faq")}
            type="button"
          >
            Ver todas las preguntas
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-[1728px] px-4 pb-14 pt-16 sm:px-8">
        <div className="flex flex-col gap-6 rounded-[24px] bg-[linear-gradient(90deg,#3b3925_0%,#2f2d1d_100%)] px-6 py-8 text-white shadow-[0_20px_60px_rgba(31,27,18,0.18)] lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-[16px] border border-white/20 bg-white/5">
              <CalendarDays className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-display text-[40px] leading-none tracking-[-0.05em] text-[#fff8ef] sm:text-[45px]">
                Tu próxima estadía en Tilcara empieza acá
              </h3>
              <p className="mt-3 max-w-[760px] text-[16px] text-white/82">
                Enviá tus fechas y la cantidad de huéspedes. Te responderemos con disponibilidad, características del alojamiento y precio total.
              </p>
              <p className="mt-3 max-w-[760px] text-[14px] text-white/70">
                Consultar no tiene costo. La reserva se confirma únicamente después de aceptar las condiciones y realizar el pago solicitado.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button
              onClick={scrollToAvailability}
              className="inline-flex h-[54px] items-center justify-center rounded-[10px] border border-white/30 px-7 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white"
              type="button"
            >
              <CalendarDays className="mr-3 h-4 w-4" />
              Consultar disponibilidad
            </button>
            <a
              href={buildWhatsAppUrl({
                number: siteSettings.whatsappNumber,
                message: whatsappMessages.general
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[54px] items-center justify-center rounded-[10px] border border-white/30 px-7 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white"
            >
              <MessageCircle className="mr-3 h-4 w-4" />
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer id="contacto" className="hidden border-t border-[#eaded1] bg-[#fbf8f3]">
        <div className="mx-auto grid max-w-[1728px] gap-10 px-4 py-16 sm:px-8 xl:grid-cols-[1.2fr_0.62fr_0.62fr_0.82fr_1fr]">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-[70px] w-[70px] items-center justify-center rounded-full border border-[#d6c1a4] text-[#69553e]">
                <Trees className="h-8 w-8" />
              </div>
              <div>
                <p className="font-display text-[42px] leading-none tracking-[-0.05em] text-[#2b2118]">Los {"\u00C1"}lamos</p>
                <p className="mt-1 pl-1 text-[10px] uppercase tracking-[0.48em] text-[#7d6958]">Tilcara</p>
              </div>
            </div>
            <p className="mt-7 max-w-[310px] text-[16px] leading-8 text-[#6d5d50]">
              Hospedaje en Tilcara, Jujuy. Un espacio tranquilo para descansar y recorrer la Quebrada de Humahuaca.
            </p>
            <div className="mt-6 flex items-center gap-4 text-[#6b594a]">
              <a href={siteSettings.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9c7b4]">
                <Instagram className="h-4 w-4" />
              </a>
              <a href={siteSettings.facebookUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9c7b4]">
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={buildWhatsAppUrl({
                  number: siteSettings.whatsappNumber,
                  message: whatsappMessages.general
                })}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9c7b4]"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">{"Navegaci\u00F3n"}</p>
            <div className="mt-6 space-y-4 text-[15px] text-[#67574b]">
              {NAV_ITEMS.map((item) => (
                <a key={item.label} href={item.href} className="block transition hover:text-[#2c221b]">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">{"Informaci\u00F3n"}</p>
            <div className="mt-6 space-y-4 text-[15px] text-[#67574b]">
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("about")}>C\u00F3mo reservar</button>
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("policies")}>Pol\u00EDticas de reserva</button>
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("faq")}>Cancelaciones</button>
              <Link className="block text-left transition hover:text-[#2c221b]" href="/terminos-y-condiciones">T\u00E9rminos y condiciones</Link>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Contacto</p>
            <div className="mt-6 space-y-4 text-[15px] text-[#67574b]">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-[#a56431]" />
                <span>{siteSettings.address}</span>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-[#a56431]" />
                <span>{siteSettings.phone}</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-[#a56431]" />
                <span>{siteSettings.email}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">{"Recib\u00ED ofertas y novedades"}</p>
            <p className="mt-6 max-w-[300px] text-[16px] leading-8 text-[#67574b]">Suscribite y enterate de promociones exclusivas.</p>
            <div className="mt-7 flex overflow-hidden rounded-[12px] border border-[#dcc7af] bg-white shadow-[0_8px_20px_rgba(86,58,34,0.04)]">
              <input placeholder="Tu email" className="h-[58px] flex-1 bg-transparent px-5 text-[15px] text-[#2c221b] outline-none" />
              <button className="inline-flex h-[58px] w-[70px] items-center justify-center bg-[#3d3a24] text-white" type="button">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[#eaded1]">
          <div className="mx-auto flex max-w-[1728px] flex-col gap-3 px-4 py-6 text-[12px] text-[#8c7a6b] sm:px-8 xl:flex-row xl:items-center xl:justify-between">
            <p>{"© 2024 Los \u00C1lamos Tilcara. Todos los derechos reservados."}</p>
            <p>{"Dise\u00F1ado con amor en la Quebrada"}</p>
            <a href="#top" className="inline-flex items-center gap-2">
              Volver arriba
              <CircleArrowUp className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>

      <footer className="border-t border-[#eaded1] bg-[#fbf8f3]">
        <div className="mx-auto grid max-w-[1728px] gap-10 px-4 py-16 sm:px-8 xl:grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr]">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-[70px] w-[70px] items-center justify-center rounded-full border border-[#d6c1a4] text-[#69553e]">
                <Trees className="h-8 w-8" />
              </div>
              <div>
                <p className="font-display text-[42px] leading-none tracking-[-0.05em] text-[#2b2118]">Los Álamos</p>
                <p className="mt-1 pl-1 text-[10px] uppercase tracking-[0.48em] text-[#7d6958]">Tilcara</p>
              </div>
            </div>
            <p className="mt-7 max-w-[330px] text-[16px] leading-8 text-[#6d5d50]">
              Hospedaje en Tilcara, Jujuy. Un espacio tranquilo para descansar y recorrer la Quebrada de Humahuaca.
            </p>
          </div>

          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Navegación</p>
            <div className="mt-6 space-y-4 text-[15px] text-[#67574b]">
              {NAV_ITEMS.map((item) => (
                <a key={item.label} href={item.href} className="block transition hover:text-[#2c221b]">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Información</p>
            <div className="mt-6 space-y-4 text-[15px] text-[#67574b]">
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("about")}>Cómo reservar</button>
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("policies")}>Políticas de reserva</button>
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("faq")}>Preguntas frecuentes</button>
              <Link className="block text-left transition hover:text-[#2c221b]" href="/terminos-y-condiciones">Términos y condiciones</Link>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Contacto</p>
            <div className="mt-6 space-y-4 text-[15px] text-[#67574b]">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-[#a56431]" />
                <span>{showAddress ? siteSettings.address : "Tilcara, Jujuy, Argentina"}</span>
              </div>
              {showPhone ? (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-[#a56431]" />
                  <span>{siteSettings.phone}</span>
                </div>
              ) : null}
              {showEmail ? (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-[#a56431]" />
                  <span>{siteSettings.email}</span>
                </div>
              ) : null}
              <a
                href={buildWhatsAppUrl({
                  number: siteSettings.whatsappNumber,
                  message: whatsappMessages.general
                })}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 text-[#67574b] transition hover:text-[#2c221b]"
              >
                <MessageCircle className="h-4 w-4 text-[#a56431]" />
                WhatsApp
              </a>
              <a href={siteSettings.instagramUrl} target="_blank" rel="noreferrer" className="block transition hover:text-[#2c221b]">
                Instagram
              </a>
              <a href={siteSettings.facebookUrl} target="_blank" rel="noreferrer" className="block transition hover:text-[#2c221b]">
                Facebook
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-[#eaded1]">
          <div className="mx-auto flex max-w-[1728px] flex-col gap-3 px-4 py-6 text-[12px] text-[#8c7a6b] sm:px-8 xl:flex-row xl:items-center xl:justify-between">
            <p>© 2026 Los Álamos Tilcara. Todos los derechos reservados.</p>
            <a href="#top" className="inline-flex items-center gap-2">
              Volver arriba
              <CircleArrowUp className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>

      <PublicBookingModal
        defaultValues={bookingDraft}
        defaultUnitId={bookingModalUnitId}
        depositPercentage={siteSettings.depositPercentage}
        onClose={() => setBookingModalOpen(false)}
        onDraftChange={setBookingDraft}
        open={bookingModalOpen}
        units={units}
      />
      <PublicReservationLookupModal
        onClose={() => setReservationLookupModalOpen(false)}
        open={reservationLookupModalOpen}
        supportUrl={buildWhatsAppUrl({
          number: siteSettings.whatsappNumber,
          message: reservationLookupWhatsappMessage
        })}
      />
      <PublicInquiryModal onClose={() => setInquiryModalOpen(false)} open={inquiryModalOpen} />
      <AccommodationModal
        open={Boolean(selectedAccommodationUnit)}
        unit={selectedAccommodationUnit}
        onClose={() => setSelectedAccommodationUnitId(null)}
        onReserve={(unitId) => {
          setSelectedAccommodationUnitId(null);
          openBookingModal(unitId);
        }}
      />
      <PublicInfoModal content={landingContent} modalId={activeInfoModal} onClose={() => setActiveInfoModal(null)} />
    </main>
  );
}

function BookingField({
  label,
  value,
  icon: Icon,
  onChange,
  type,
  min,
  placeholder
}: {
  label: string;
  value: string;
  icon: typeof Calendar;
  onChange: (value: string) => void;
  type: "number";
  min?: number;
  placeholder?: string;
}) {
  return (
    <label className="block rounded-[18px] border border-[#e3d3c2] bg-[#fbf8f4] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:rounded-[20px] sm:px-6 sm:py-5">
      <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2f241b] sm:text-[12px]">{label}</span>
      <span className="mt-4 flex items-center gap-3 text-[15px] text-[#201814] sm:text-[16px]">
        <input
          className="min-w-0 flex-1 bg-transparent text-[#201814] outline-none placeholder:text-[#201814]"
          min={min}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        <Icon className="h-4 w-4 shrink-0 text-[var(--color-accent-strong)]" />
      </span>
    </label>
  );
}

function SelectBookingField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block rounded-[18px] border border-[#e3d3c2] bg-[#fbf8f4] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:rounded-[20px] sm:px-6 sm:py-5">
      <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2f241b] sm:text-[12px]">{label}</span>
      <span className="mt-4 flex items-center gap-3 text-[15px] text-[#201814] sm:text-[16px]">
        <select className="min-w-0 flex-1 appearance-none bg-transparent text-[#201814] outline-none" onChange={(event) => onChange(event.target.value)} value={value}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-accent-strong)]" />
      </span>
    </label>
  );
}

function ModalFrame({
  children,
  onClose,
  open,
  title
}: {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  useModalBehavior(open, onClose);

  if (!open) {
    return null;
  }

  return (
    <div
      className="hallmark-modal fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="hallmark-modal-card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="font-display text-[2.35rem] leading-none tracking-[-0.04em] text-[var(--color-ink)]">{title}</h3>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-rule)] text-[var(--color-ink-2)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PublicBookingModal({
  defaultValues,
  defaultUnitId,
  depositPercentage,
  onClose,
  onDraftChange,
  open,
  units
}: {
  defaultValues?: BookingPrefill;
  defaultUnitId?: string;
  depositPercentage: number;
  onClose: () => void;
  onDraftChange: React.Dispatch<React.SetStateAction<BookingPrefill>>;
  open: boolean;
  units: Unit[];
}) {
  const { runBlockingAction } = useAppFeedback();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"form" | "otp" | "done">("form");
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationRequestSchema),
    defaultValues: {
      adults: defaultValues?.adults ?? 2,
      children: defaultValues?.children ?? 0,
      checkIn: defaultValues?.checkIn ?? "",
      checkOut: defaultValues?.checkOut ?? "",
      unitId: defaultValues?.unitId ?? defaultUnitId,
      fullName: defaultValues?.fullName ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      city: defaultValues?.city ?? "",
      country: defaultValues?.country ?? "",
      specialNotes: defaultValues?.specialNotes ?? "",
      estimatedArrivalTime: defaultValues?.estimatedArrivalTime ?? ""
    }
  });
  const watchedUnitId = form.watch("unitId");
  const watchedCheckIn = form.watch("checkIn");
  const watchedCheckOut = form.watch("checkOut");
  const watchedFullName = form.watch("fullName");
  const watchedPhone = form.watch("phone");
  const watchedEmail = form.watch("email");
  const watchedCity = form.watch("city");
  const watchedCountry = form.watch("country");
  const watchedAdults = form.watch("adults");
  const watchedSpecialNotes = form.watch("specialNotes");
  const watchedEstimatedArrivalTime = form.watch("estimatedArrivalTime");
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === watchedUnitId),
    [units, watchedUnitId]
  );
  const selectedAdultRate = useMemo(
    () => selectedUnit?.adultPriceRates.find((rate) => rate.active && rate.adults === watchedAdults),
    [selectedUnit, watchedAdults]
  );
  const pricingPreview = useMemo(
    () =>
      buildPricingPreview({
        checkIn: watchedCheckIn,
        checkOut: watchedCheckOut,
        pricePerNight: selectedAdultRate?.pricePerNight,
        cleaningFee: selectedUnit?.cleaningFee,
        depositPercentage
      }),
    [depositPercentage, selectedAdultRate?.pricePerNight, selectedUnit?.cleaningFee, watchedCheckIn, watchedCheckOut]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      adults: defaultValues?.adults ?? 2,
      children: defaultValues?.children ?? 0,
      checkIn: defaultValues?.checkIn ?? "",
      checkOut: defaultValues?.checkOut ?? "",
      unitId: defaultValues?.unitId ?? defaultUnitId ?? "",
      fullName: defaultValues?.fullName ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      city: defaultValues?.city ?? "",
      country: defaultValues?.country ?? "",
      specialNotes: defaultValues?.specialNotes ?? "",
      estimatedArrivalTime: defaultValues?.estimatedArrivalTime ?? ""
    });
  }, [defaultUnitId, form, open]);

  useEffect(() => {
    onDraftChange((current) =>
      normalizeBookingDraft({
        ...current,
        adults: Number(watchedAdults ?? defaultValues?.adults ?? 2),
        children: 0,
        checkIn: watchedCheckIn,
        checkOut: watchedCheckOut,
        unitId: watchedUnitId,
        fullName: watchedFullName,
        phone: watchedPhone,
        email: watchedEmail,
        city: watchedCity,
        country: watchedCountry,
        specialNotes: watchedSpecialNotes,
        estimatedArrivalTime: watchedEstimatedArrivalTime
      })
    );
  }, [
    onDraftChange,
    defaultValues?.adults,
    watchedAdults,
    watchedCity,
    watchedCheckIn,
    watchedCheckOut,
    watchedCountry,
    watchedEmail,
    watchedEstimatedArrivalTime,
    watchedFullName,
    watchedPhone,
    watchedSpecialNotes,
    watchedUnitId
  ]);

  async function onSubmit(values: ReservationFormValues) {
    setRequestId(null);
    setMaskedEmail(null);
    setSubmittedCode(null);
    setCheckoutUrl(null);
    setRequestError(null);

    try {
      const data = await runBlockingAction(
        async () => {
          const response = await fetch("/api/reservation-requests/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
          });

          const payload = (await response.json().catch(() => null)) as
            | { requestId?: string; maskedEmail?: string; error?: string }
            | null;

          if (!response.ok || !payload?.requestId || !payload?.maskedEmail) {
            throw new Error(payload?.error ?? "No pudimos iniciar la reserva.");
          }

          return {
            requestId: payload.requestId,
            maskedEmail: payload.maskedEmail
          };
        },
        {
          loadingMessage: "Estamos iniciando tu solicitud de reserva.",
          successMessage: "Te enviamos el codigo de verificacion por email."
        }
      );

      setRequestId(data.requestId);
      setMaskedEmail(data.maskedEmail);
      setOtpStep("otp");
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "No pudimos iniciar la reserva. Revisa los datos e intenta nuevamente."
      );
    }
  }

  async function handleOtpVerification() {
    if (!requestId) {
      setRequestError("No encontramos una solicitud activa para verificar.");
      return;
    }

    setRequestError(null);

    try {
      const data = await runBlockingAction(
        async () => {
          const verifyResponse = await fetch("/api/reservation-requests/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId,
              code: otpCode
            })
          });

          const verifyPayload = (await verifyResponse.json().catch(() => null)) as
            | { error?: string }
            | null;

          if (!verifyResponse.ok) {
            throw new Error(verifyPayload?.error ?? "No pudimos validar el codigo.");
          }

          const checkoutResponse = await fetch("/api/reservation-requests/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId
            })
          });

          const checkoutPayload = (await checkoutResponse.json().catch(() => null)) as
            | { reservationCode?: string; checkoutUrl?: string | null; error?: string }
            | null;

          if (!checkoutResponse.ok) {
            throw new Error(checkoutPayload?.error ?? "No pudimos generar el checkout.");
          }

          if (!checkoutPayload?.checkoutUrl || !checkoutPayload.reservationCode) {
            throw new Error("No pudimos iniciar el checkout de Mercado Pago.");
          }

          return {
            reservationCode: checkoutPayload.reservationCode,
            checkoutUrl: checkoutPayload.checkoutUrl
          };
        },
        {
          loadingMessage: "Estamos validando el codigo y preparando el pago.",
          successMessage: "Codigo validado. Redirigiendo al checkout."
        }
      );

      setSubmittedCode(data.reservationCode);
      setCheckoutUrl(data.checkoutUrl);
      setOtpStep("done");
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "No pudimos validar el código o generar el checkout."
      );
    }
  }

  async function handleOtpResend() {
    if (!requestId) {
      setRequestError("No encontramos una solicitud activa para reenviar el código.");
      return;
    }

    setRequestError(null);

    try {
      const data = await runBlockingAction(
        async () => {
          const response = await fetch("/api/reservation-requests/resend-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId
            })
          });

          const payload = (await response.json().catch(() => null)) as
            | { maskedEmail?: string; error?: string }
            | null;

          if (!response.ok || !payload?.maskedEmail) {
            throw new Error(payload?.error ?? "No pudimos reenviar el codigo.");
          }

          return { maskedEmail: payload.maskedEmail };
        },
        {
          loadingMessage: "Estamos reenviando el codigo de verificacion.",
          successMessage: "Te reenviamos el codigo por email."
        }
      );
      setMaskedEmail(data.maskedEmail);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "No pudimos reenviar el código. Intenta nuevamente."
      );
    }
  }

  return (
    <ModalFrame onClose={onClose} open={open} title="Solicitud de reserva">
      <p className="mb-5 text-[16px] leading-8 text-[var(--color-ink-2)]">
        {"Primero validamos tu email con un c\u00F3digo y reci\u00E9n despu\u00E9s generamos el pago."}
      </p>
      {otpStep === "form" ? (
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="text-sm text-[var(--color-ink-2)]">
            Nombre completo
            <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" {...form.register("fullName")} />
          </label>
          <label className="text-sm text-[var(--color-ink-2)]">
            WhatsApp
            <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" {...form.register("phone")} />
          </label>
          <label className="text-sm text-[var(--color-ink-2)]">
            Email
            <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" type="email" {...form.register("email")} />
          </label>
          <label className="text-sm text-[var(--color-ink-2)]">
            Alojamiento
            <select
              className="mt-2 h-11 w-full rounded-[16px] border border-[var(--color-rule)] bg-white px-4 text-sm text-[var(--color-ink)]"
              {...form.register("unitId")}
            >
              <option value="">Cualquier unidad</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <DateRangePicker
              checkIn={watchedCheckIn}
              checkOut={watchedCheckOut}
              monthsToShow={1}
              onChange={({ checkIn, checkOut }) => {
                form.setValue("checkIn", checkIn, { shouldDirty: true, shouldValidate: true });
                form.setValue("checkOut", checkOut, { shouldDirty: true, shouldValidate: true });
              }}
            />
          </div>
          <label className="text-sm text-[var(--color-ink-2)]">
            Adultos
            <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" min={1} type="number" {...form.register("adults")} />
          </label>
          <div className="rounded-[18px] border border-[var(--color-rule)] bg-[oklch(0.98_0.01_80)] p-4 text-sm text-[var(--color-ink-2)]">
            El valor se calcula segun la cantidad de adultos y las noches seleccionadas. La solicitud queda sujeta a confirmacion de disponibilidad.
          </div>
          <label className="text-sm text-[var(--color-ink-2)] md:col-span-2">
            Notas especiales
            <Textarea className="mt-2 rounded-[16px] border-[var(--color-rule)]" {...form.register("specialNotes")} />
          </label>
          <label className="text-sm text-[var(--color-ink-2)] md:col-span-2">
            Hora estimada de llegada
            <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" placeholder="18:30" {...form.register("estimatedArrivalTime")} />
          </label>
          <div className="rounded-[18px] border border-[var(--color-rule)] bg-[oklch(0.98_0.01_80)] p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
              Resumen de la reserva
            </p>
            {selectedUnit && pricingPreview ? (
              <div className="mt-3 space-y-2 text-sm text-[var(--color-ink-2)]">
                <div className="flex items-center justify-between gap-4">
                  <span>Precio por noche</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.pricePerNight, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Noches</span>
                  <strong className="text-[var(--color-ink)]">
                    {pricingPreview.nights} {pricingPreview.nights === 1 ? "noche" : "noches"}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Total alojamiento</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.subtotal, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Limpieza</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.cleaningFee, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Sena inicial ({depositPercentage}%)</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.depositAmount, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[var(--color-rule)] pt-2 text-base">
                  <span className="font-semibold text-[var(--color-ink)]">Total estimado</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.total, "ARS")}</strong>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-ink-2)]">
                Elegi una unidad y completa check-in, check-out y adultos para ver la cotizacion.
              </p>
            )}
          </div>
          {form.formState.errors.checkOut ? <p className="text-sm text-[var(--color-danger)] md:col-span-2">{form.formState.errors.checkOut.message}</p> : null}
          {requestError ? <p className="text-sm text-[var(--color-danger)] md:col-span-2">{requestError}</p> : null}
          <div className="flex justify-end md:col-span-2">
            <Button className="rounded-[16px] px-6" type="submit">
              {form.formState.isSubmitting ? "Enviando codigo..." : "Solicitar reserva"}
            </Button>
          </div>
        </form>
      ) : null}
      {otpStep === "otp" ? (
        <div className="space-y-4">
          <p className="rounded-[18px] bg-[oklch(0.97_0.01_80)] px-4 py-3 text-sm text-[var(--color-ink-2)]">
            {"Te enviamos un c\u00F3digo a "}<strong>{maskedEmail}</strong>{". Ingr\u00E9salo para continuar con el pago."}
          </p>
          {selectedUnit && pricingPreview ? (
            <div className="rounded-[18px] border border-[var(--color-rule)] bg-[oklch(0.98_0.01_80)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
                Resumen del pago inicial
              </p>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-ink-2)]">
                <div className="flex items-center justify-between gap-4">
                  <span>Precio por noche</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.pricePerNight, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Total estimado</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.total, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[var(--color-rule)] pt-2 text-base">
                  <span className="font-semibold text-[var(--color-ink)]">Sena a pagar</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.depositAmount, "ARS")}</strong>
                </div>
              </div>
            </div>
          ) : null}
          <label className="block text-sm text-[var(--color-ink-2)]">
            {"C\u00F3digo OTP"}
            <Input
              className="mt-2 rounded-[16px] border-[var(--color-rule)] text-center text-lg tracking-[0.35em]"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              value={otpCode}
            />
          </label>
          {requestError ? <p className="text-sm text-[var(--color-danger)]">{requestError}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button className="rounded-[16px] px-6" onClick={() => void handleOtpVerification()} type="button">
              Validar y continuar al pago
            </Button>
            <Button className="rounded-[16px] px-6" onClick={() => void handleOtpResend()} type="button" variant="outline">
              Reenviar codigo
            </Button>
          </div>
        </div>
      ) : null}
      {otpStep === "done" ? (
        <div className="space-y-4">
          {checkoutUrl ? (
            <div className="space-y-4">
              <p className="rounded-[18px] bg-[oklch(0.95_0.03_145)] px-4 py-3 text-sm text-[var(--color-forest)]">
                {"Email validado correctamente. Ahora continuá el pago para confirmar la reserva."}
              </p>
              <a className="hallmark-button-secondary" href={checkoutUrl}>
                Ir al checkout de Mercado Pago
              </a>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-2)]">
              {"No pudimos iniciar el checkout. Volvé a intentarlo."}
            </p>
          )}
        </div>
      ) : null}
    </ModalFrame>
  );
}

function PublicReservationLookupModal({
  onClose,
  open,
  supportUrl
}: {
  onClose: () => void;
  open: boolean;
  supportUrl: string;
}) {
  return (
    <ModalFrame onClose={onClose} open={open} title="Consulta privada de reserva">
      <PublicReservationLookupPanel supportUrl={supportUrl} />
    </ModalFrame>
  );
}

function PublicInquiryModal({
  onClose,
  open
}: {
  onClose: () => void;
  open: boolean;
}) {
  const { runBlockingAction } = useAppFeedback();
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema)
  });

  useEffect(() => {
    setSubmittedId(null);
    setRequestError(null);
    form.reset();
  }, [form, open]);

  async function onSubmit(values: InquiryFormValues) {
    setSubmittedId(null);
    setRequestError(null);

    try {
      const data = await runBlockingAction(
        async () => {
          const response = await fetch("/api/inquiries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
          });

          const payload = (await response.json().catch(() => null)) as
            | { inquiryId?: string; inquiry?: Inquiry; error?: string }
            | null;

          if (!response.ok || !payload?.inquiryId) {
            throw new Error(payload?.error ?? "No pudimos enviar tu consulta.");
          }

          return { inquiryId: payload.inquiryId };
        },
        {
          loadingMessage: "Estamos enviando tu consulta.",
          successMessage: "La consulta se envio correctamente."
        }
      );

      setSubmittedId(data.inquiryId);
      form.reset();
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "No pudimos enviar tu consulta. Intenta nuevamente."
      );
    }
  }

  return (
    <ModalFrame onClose={onClose} open={open} title="Enviar consulta">
      <p className="mb-5 text-[16px] leading-8 text-[var(--color-ink-2)]">
        Escribinos y te respondemos por WhatsApp o email a la brevedad.
      </p>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="text-sm text-[var(--color-ink-2)]">
          Nombre
          <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" {...form.register("fullName")} />
        </label>
        <label className="text-sm text-[var(--color-ink-2)]">
          WhatsApp
          <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" {...form.register("phone")} />
        </label>
        <label className="text-sm text-[var(--color-ink-2)]">
          Email
          <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" type="email" {...form.register("email")} />
        </label>
        <label className="text-sm text-[var(--color-ink-2)]">
          Consulta
          <Textarea className="mt-2 rounded-[16px] border-[var(--color-rule)]" {...form.register("message")} />
        </label>
        {requestError ? <p className="text-sm text-[var(--color-danger)]">{requestError}</p> : null}
        {submittedId ? (
          <p className="rounded-[18px] bg-[oklch(0.95_0.03_145)] px-4 py-3 text-sm text-[var(--color-forest)]">
            Consulta enviada correctamente. ID: {submittedId}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button className="rounded-[16px] px-6" type="submit" variant="secondary">
            {form.formState.isSubmitting ? "Enviando..." : "Enviar consulta"}
          </Button>
        </div>
      </form>
    </ModalFrame>
  );
}

function PublicInfoModal({
  content,
  modalId,
  onClose
}: {
  content: LandingContent;
  modalId: PublicInfoModalId | null;
  onClose: () => void;
}) {
  const open = modalId !== null;

  let title = "";
  let body: React.ReactNode = null;

  if (modalId === "about") {
    title = "Sobre nosotros";
    body = <p className="text-[16px] leading-8 text-[var(--color-ink-2)]">{content.about}</p>;
  }

  if (modalId === "policies") {
    title = "Políticas";
    body = (
      <div className="space-y-4">
        {content.policies.map((policy) => (
          <div key={policy.title} className="rounded-[18px] border border-[var(--color-rule)] p-4">
            <p className="text-lg font-semibold text-[var(--color-ink)]">{policy.title}</p>
            <p className="mt-2 text-[15px] leading-7 text-[var(--color-ink-2)]">{policy.body}</p>
          </div>
        ))}
      </div>
    );
  }

  if (modalId === "faq") {
    title = "Preguntas frecuentes";
    body = (
      <div className="space-y-4">
        {content.faqs.map((faq) => (
          <div key={faq.id} className="rounded-[18px] border border-[var(--color-rule)] p-4">
            <p className="text-lg font-semibold text-[var(--color-ink)]">{faq.question}</p>
            <p className="mt-2 text-[15px] leading-7 text-[var(--color-ink-2)]">{faq.answer}</p>
          </div>
        ))}
      </div>
    );
  }

  if (modalId === "terms") {
    title = "Términos y condiciones";
    body = (
      <div className="space-y-4 text-[15px] leading-7 text-[var(--color-ink-2)]">
        <p>{"Las solicitudes enviadas desde esta web no garantizan una reserva inmediata. Toda reserva queda sujeta a confirmación manual por parte del equipo."}</p>
        <p>{"La disponibilidad publicada es orientativa para fines de prueba. Las condiciones finales, precios y políticas se confirman por mensaje o email."}</p>
        <p>{"Al enviar un formulario, aceptás que podamos contactarte para completar la gestión de tu consulta o solicitud de reserva."}</p>
      </div>
    );
  }

  return (
    <ModalFrame onClose={onClose} open={open} title={title || "Información"}>
      {body}
    </ModalFrame>
  );
}

