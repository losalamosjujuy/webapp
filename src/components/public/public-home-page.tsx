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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { propertyImages } from "@/data/property-images";
import {
  buildWhatsAppMessages,
  buildWhatsAppUrl,
  persistInquiryToAdminDemo,
  type PublicInfoModalId
} from "@/lib/public-site";
import { buildPricingPreview } from "@/lib/pricing/pricing";
import { formatCurrency } from "@/lib/utils/format";
import { resolvePublicImage } from "@/lib/utils/images";
import { inquirySchema, reservationRequestSchema } from "@/lib/validations/reservation";
import type { GalleryItem, Inquiry, LandingContent, SiteSettings, Unit } from "@/types/domain";

const SERVICE_ICONS = [Wifi, UtensilsCrossed, Mountain, Car, CookingPot, Trees, HeartHandshake];
const SERVICE_LABELS = [
  { title: "Wi-Fi", subtitle: "gratuito" },
  { title: "Desayuno", subtitle: "opcional" },
  { title: "Calefacci\u00F3n", subtitle: "en todos los ambientes" },
  { title: "Estacionamiento", subtitle: "gratuito" },
  { title: "Cocina", subtitle: "equipada" },
  { title: "Patio y jard\u00EDn", subtitle: "con vistas" },
  { title: "Asistencia", subtitle: "personalizada" }
];

const FALLBACK_TESTIMONIALS = [
  {
    quote:
      "Un lugar hermoso, s\u00FAper tranquilo y muy bien ubicado. La atenci\u00F3n de 10, sin duda volveremos.",
    author: "Mariana, Buenos Aires"
  },
  {
    quote:
      "La caba\u00F1a tiene todo lo necesario y las vistas son incre\u00EDbles. Recomendad\u00EDsimo.",
    author: "Lucas, C\u00F3rdoba"
  },
  {
    quote:
      "Nos sentimos como en casa. Tilcara es m\u00E1gico y Los \u00C1lamos lo hace a\u00FAn mejor.",
    author: "Ana y Pedro, Mendoza"
  }
];

const LOCATION_HIGHLIGHTS = [
  "7 min del centro de Tilcara",
  "10 min del Pucar\u00E1",
  "15 min de Garganta del Diablo"
];

const NAV_ITEMS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Alojamientos", href: "#alojamientos" },
  { label: "Servicios", href: "#servicios" },
  { label: "Galer\u00EDa", href: "#galeria" },
  { label: "Ubicaci\u00F3n", href: "#ubicacion" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Contacto", href: "#contacto" }
];

type AvailabilityResult = {
  units: Array<Pick<Unit, "id" | "name" | "shortDescription" | "basePricePerNight" | "featuredImage" | "maxGuests">>;
};

type BookingPrefill = Partial<ReservationFormValues> & {
  unitId?: string;
};

type ReservationFormValues = z.infer<typeof reservationRequestSchema>;
type InquiryFormValues = z.infer<typeof inquirySchema>;

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
  const testimonials = landingContent.testimonials.length
    ? landingContent.testimonials.map((item) => ({
        quote: item.quote,
        author: item.guestName
      }))
    : FALLBACK_TESTIMONIALS;

  const [activeInfoModal, setActiveInfoModal] = useState<PublicInfoModalId | null>(null);
  const [bookingModalUnitId, setBookingModalUnitId] = useState<string | undefined>();
  const [bookingModalPrefill, setBookingModalPrefill] = useState<BookingPrefill>({});
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [availabilityResults, setAvailabilityResults] = useState<AvailabilityResult | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [searchForm, setSearchForm] = useState({
    checkIn: "",
    checkOut: "",
    guests: "1",
    unitId: ""
  });

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

    setAvailabilityLoading(true);

    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...searchForm,
          guests: Number(searchForm.guests),
          unitId: searchForm.unitId || undefined
        })
      });

      const data = (await response.json()) as AvailabilityResult;
      setAvailabilityResults(data);
    } catch {
      setAvailabilityError("No pudimos consultar disponibilidad. Intenta nuevamente.");
    } finally {
      setAvailabilityLoading(false);
    }
  }

  function openBookingModal(unitId?: string) {
    setBookingModalPrefill({
      checkIn: searchForm.checkIn || undefined,
      checkOut: searchForm.checkOut || undefined,
      adults: Number(searchForm.guests || "2"),
      children: 0,
      unitId: unitId ?? searchForm.unitId ?? undefined
    });
    setBookingModalUnitId(unitId);
    setBookingModalOpen(true);
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
              <p>Tilcara, Jujuy, Argentina</p>
              <div className="flex flex-wrap items-center gap-5">
                <a href={`tel:${siteSettings.phone}`} className="inline-flex items-center gap-2 whitespace-nowrap">
                  <Phone className="h-3.5 w-3.5" />
                  {siteSettings.phone}
                </a>
                <a
                  href={buildWhatsAppUrl({
                    number: siteSettings.whatsappNumber,
                    message: whatsappMessages.general
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Escribinos por WhatsApp
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
                  <p className="font-display text-[34px] leading-none tracking-[-0.05em] text-[#fffaf4] sm:text-[44px]">Los {"\u00C1"}lamos</p>
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
                onClick={() => openBookingModal()}
                className="inline-flex h-14 w-full items-center justify-center rounded-[22px] border border-[#b8a27f] bg-[#35311f] px-6 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(12,10,7,0.16)] sm:h-[64px] sm:w-auto sm:rounded-[26px] sm:px-9 sm:text-[12px]"
              >
                <CalendarDays className="mr-3 h-4 w-4" />
                Consultar disponibilidad
              </button>
            </header>

            <div className="min-h-[700px] pt-8 pb-24 sm:min-h-[860px] sm:pt-12 sm:pb-36">
              <div className="max-w-[630px] pt-10 sm:pt-16">
                <h1 className="font-display text-[54px] leading-[0.92] tracking-[-0.06em] text-[#fff9f3] sm:text-[92px]">
                  Los {"\u00C1"}lamos
                  <br />
                  Tilcara
                </h1>
                <p className="mt-6 text-[15px] font-semibold uppercase tracking-[0.2em] text-[#f2ead9] sm:mt-8 sm:text-[29px] sm:tracking-[0.22em]">
                  Descanso, naturaleza y conexi\u00F3n
                </p>
                <p className="mt-6 max-w-[560px] text-[17px] leading-[1.65] text-white/90 sm:mt-8 sm:text-[20px] sm:leading-[1.72]">
                  Un lugar para descansar y conectar
                  <br />
                  con la magia de la Quebrada de Humahuaca.
                </p>

                <div className="mt-8 grid gap-3 md:grid-cols-3 sm:mt-11">
                  {landingContent.hero.trustPoints.slice(0, 3).map((point, index) => {
                    const Icon = index === 0 ? CalendarDays : index === 1 ? HeartHandshake : MapPin;
                    const subtitle =
                      index === 0
                        ? "Mejor precio garantizado"
                        : index === 1
                          ? "Estamos para vos"
                          : "Cerca de todo";

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
                    onClick={() => openBookingModal()}
                    className="inline-flex h-[54px] items-center justify-center rounded-[20px] border border-[#b2a071] bg-[#37341f] px-6 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white sm:h-[58px] sm:rounded-[24px] sm:px-8 sm:text-[13px]"
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
                    className="inline-flex h-[54px] items-center justify-center rounded-[20px] border border-white/35 bg-white/[0.06] px-6 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white sm:h-[58px] sm:rounded-[24px] sm:px-8 sm:text-[13px]"
                  >
                    <MessageCircle className="mr-3 h-4 w-4" />
                    Escribir por WhatsApp
                  </a>
                </div>
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
                <BookingField
                  label="Check-in"
                  value={searchForm.checkIn}
                  icon={Calendar}
                  onChange={(value) => setSearchForm((current) => ({ ...current, checkIn: value }))}
                  type="date"
                  placeholder="Seleccionar fecha"
                />
                <BookingField
                  label="Check-out"
                  value={searchForm.checkOut}
                  icon={Calendar}
                  onChange={(value) => setSearchForm((current) => ({ ...current, checkOut: value }))}
                  type="date"
                  placeholder="Seleccionar fecha"
                />
                <BookingField
                  label={"Hu\u00E9spedes"}
                  value={searchForm.guests}
                  icon={User}
                  onChange={(value) => setSearchForm((current) => ({ ...current, guests: value }))}
                  type="number"
                  min={1}
                  placeholder={"1 hu\u00E9sped"}
                />
                <SelectBookingField
                  label="Alojamiento"
                  value={searchForm.unitId}
                  onChange={(value) => setSearchForm((current) => ({ ...current, unitId: value }))}
                  options={[
                    { value: "", label: "Cualquiera" },
                    ...units.map((unit) => ({ value: unit.id, label: unit.name }))
                  ]}
                />
                <button
                  type="submit"
                  className="inline-flex h-[68px] items-center justify-center rounded-[16px] bg-[#39361f] px-6 text-[13px] font-extrabold uppercase tracking-[0.08em] text-white sm:h-[74px] sm:text-[14px]"
                >
                  {availabilityLoading ? "Consultando..." : "Ver disponibilidad"}
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
                              Desde {formatCurrency(unit.basePricePerNight, "ARS")} / noche
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
        <section className="rounded-[28px] border border-[#efe2d3] bg-[#fcfbf8] px-4 pb-6 pt-6 shadow-[0_18px_38px_rgba(108,79,48,0.08),0_38px_90px_rgba(108,79,48,0.12)] sm:rounded-[34px] sm:px-8 sm:pb-8 sm:pt-7">
          <div>
            <h2 className="font-display text-[32px] leading-none tracking-[-0.055em] text-[#2b2118] sm:text-[40px] lg:text-[42px]">
              {"\u00BFCu\u00E1ndo quer\u00E9s venir?"}
            </h2>
            <p className="mt-3 text-[15px] text-[#78675a] sm:text-[16px]">
              {"Consult\u00E1 disponibilidad sin compromiso. Te respondemos a la brevedad."}
            </p>
          </div>

          <form onSubmit={handleAvailabilitySubmit} className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_236px] xl:items-end">
            <BookingField
              label="Check-in"
              value={searchForm.checkIn}
              icon={Calendar}
              onChange={(value) => setSearchForm((current) => ({ ...current, checkIn: value }))}
              type="date"
              placeholder="Seleccionar fecha"
            />
            <BookingField
              label="Check-out"
              value={searchForm.checkOut}
              icon={Calendar}
              onChange={(value) => setSearchForm((current) => ({ ...current, checkOut: value }))}
              type="date"
              placeholder="Seleccionar fecha"
            />
            <BookingField
              label={"Hu\u00E9spedes"}
              value={searchForm.guests}
              icon={User}
              onChange={(value) => setSearchForm((current) => ({ ...current, guests: value }))}
              type="number"
              min={1}
              placeholder={"1 hu\u00E9sped"}
            />
            <SelectBookingField
              label="Alojamiento"
              value={searchForm.unitId}
              onChange={(value) => setSearchForm((current) => ({ ...current, unitId: value }))}
              options={[
                { value: "", label: "Cualquiera" },
                ...units.map((unit) => ({ value: unit.id, label: unit.name }))
              ]}
            />
            <button
              type="submit"
              className="inline-flex h-[68px] w-full items-center justify-center self-stretch rounded-[16px] bg-[#39361f] px-6 text-[13px] font-extrabold uppercase tracking-[0.08em] text-white sm:h-[74px] sm:text-[14px] xl:self-auto"
            >
              {availabilityLoading ? "Consultando..." : "Ver disponibilidad"}
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
                          Desde {formatCurrency(unit.basePricePerNight, "ARS")} / noche
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
                      Enviar solicitud
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
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Alojamientos</p>
          <h2 className="mt-5 font-display text-[52px] leading-[1.04] tracking-[-0.06em] text-[#2b2118] sm:text-[58px]">
            {"Eleg\u00ED tu lugar ideal"}
          </h2>
          <p className="mt-7 max-w-[270px] text-[18px] leading-[1.85] text-[#78685b]">
            {"Espacios c\u00F3modos y acogedores, pensados para que disfrutes de Tilcara como en casa."}
          </p>
          <button onClick={() => openBookingModal()} className="mt-8 inline-flex h-[50px] items-center justify-center rounded-[12px] border border-[#d7b18e] px-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9a5d2e] sm:mt-10 sm:h-[54px] sm:px-8 sm:text-[12px]">
            Ver todos los alojamientos
          </button>
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
                    {unit.maxGuests} {"hu\u00E9spedes"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" />
                    {unit.beds}
                  </span>
                </div>
                <p className="mt-4 text-[15px] leading-8 text-[#6c5b50]">{unit.shortDescription}</p>
                <button
                  onClick={() => openBookingModal(unit.id)}
                  className="mt-6 inline-flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#ae6a35]"
                >
                  Ver detalles
                  <ChevronRight className="h-4 w-4" />
                </button>
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
              {"Todo lo que necesit\u00E1s para una estad\u00EDa perfecta"}
            </h2>
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

      <section id="galeria" className="mx-auto grid max-w-[1728px] gap-10 px-4 py-16 sm:px-8 sm:py-20 xl:grid-cols-[312px_1fr]">
        <aside className="pt-3">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">{"Galer\u00EDa"}</p>
          <h2 className="mt-5 font-display text-[48px] leading-[1.08] tracking-[-0.06em] text-[#2b2118] sm:text-[52px]">
            {"Conoc\u00E9 Los \u00C1lamos"}
          </h2>
          <p className="mt-6 max-w-[260px] text-[17px] leading-[1.85] text-[#7c6b5d]">
            {"Ambientes c\u00E1lidos, rodeados de naturaleza y la energ\u00EDa \u00FAnica de Tilcara."}
          </p>
          <button className="mt-10 inline-flex h-[52px] items-center justify-center rounded-[12px] border border-[#d7b18e] px-8 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#9a5d2e]">
            {"Ver galer\u00EDa completa"}
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

      <section className="border-t border-[#efe3d7]">
        <div className="mx-auto grid max-w-[1728px] gap-10 px-4 py-16 sm:px-8 xl:grid-cols-[1.15fr_1.1fr]">
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
                src={`https://www.google.com/maps?q=${siteSettings.coordinates.lat},${siteSettings.coordinates.lng}&z=15&output=embed`}
                className="h-[390px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1728px] px-4 pb-14 sm:px-8">
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
          </div>
        </div>
      </section>

      <footer id="contacto" className="border-t border-[#eaded1] bg-[#fbf8f3]">
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
              {"Hospedaje familiar en Tilcara, Jujuy. Atenci\u00F3n personalizada y el mejor descanso en la Quebrada de Humahuaca."}
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
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("about")}>Sobre nosotros</button>
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("policies")}>{"Pol\u00EDticas"}</button>
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("faq")}>Preguntas frecuentes</button>
              <button className="block text-left transition hover:text-[#2c221b]" onClick={() => setActiveInfoModal("terms")}>{"T\u00E9rminos y condiciones"}</button>
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

      <PublicBookingModal
        defaultValues={bookingModalPrefill}
        defaultUnitId={bookingModalUnitId}
        onClose={() => setBookingModalOpen(false)}
        open={bookingModalOpen}
        units={units}
      />
      <PublicInquiryModal onClose={() => setInquiryModalOpen(false)} open={inquiryModalOpen} />
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
  type: "date" | "number";
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
        {type === "date" ? <CalendarDays className="h-4 w-4 shrink-0 text-[#201814]" /> : null}
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
  onClose,
  open,
  units
}: {
  defaultValues?: BookingPrefill;
  defaultUnitId?: string;
  onClose: () => void;
  open: boolean;
  units: Unit[];
}) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"form" | "otp" | "done">("form");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
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
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === watchedUnitId),
    [units, watchedUnitId]
  );
  const pricingPreview = useMemo(
    () =>
      buildPricingPreview({
        checkIn: watchedCheckIn,
        checkOut: watchedCheckOut,
        basePricePerNight: selectedUnit?.basePricePerNight,
        cleaningFee: selectedUnit?.cleaningFee
      }),
    [selectedUnit, watchedCheckIn, watchedCheckOut]
  );

  useEffect(() => {
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
    setRequestId(null);
    setMaskedEmail(null);
    setOtpCode("");
    setOtpStep("form");
    setOtpLoading(false);
    setResendLoading(false);
    setSubmittedCode(null);
    setCheckoutUrl(null);
    setRequestError(null);
  }, [defaultUnitId, defaultValues, form, open]);

  async function onSubmit(values: ReservationFormValues) {
    setRequestId(null);
    setMaskedEmail(null);
    setSubmittedCode(null);
    setCheckoutUrl(null);
    setRequestError(null);

    try {
      const response = await fetch("/api/reservation-requests/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "No pudimos iniciar la reserva.");
      }

      const data = (await response.json()) as { requestId: string; maskedEmail: string };
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

    setOtpLoading(true);
    setRequestError(null);

    try {
      const verifyResponse = await fetch("/api/reservation-requests/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          code: otpCode
        })
      });

      if (!verifyResponse.ok) {
        const errorPayload = (await verifyResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "otp_failed");
      }

      const checkoutResponse = await fetch("/api/reservation-requests/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId
        })
      });

      if (!checkoutResponse.ok) {
        const errorPayload = (await checkoutResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "checkout_failed");
      }

      const data = (await checkoutResponse.json()) as { reservationCode: string; checkoutUrl?: string | null };
      if (!data.checkoutUrl) {
        throw new Error("No pudimos iniciar el checkout de Mercado Pago.");
      }

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
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleOtpResend() {
    if (!requestId) {
      setRequestError("No encontramos una solicitud activa para reenviar el código.");
      return;
    }

    setResendLoading(true);
    setRequestError(null);

    try {
      const response = await fetch("/api/reservation-requests/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId
        })
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "resend_failed");
      }

      const data = (await response.json()) as { maskedEmail: string };
      setMaskedEmail(data.maskedEmail);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "No pudimos reenviar el código. Intenta nuevamente."
      );
    } finally {
      setResendLoading(false);
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
          <label className="text-sm text-[var(--color-ink-2)]">
            Check-in
            <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" type="date" {...form.register("checkIn")} />
          </label>
          <label className="text-sm text-[var(--color-ink-2)]">
            Check-out
            <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" type="date" {...form.register("checkOut")} />
          </label>
          <label className="text-sm text-[var(--color-ink-2)]">
            Adultos
            <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" min={1} type="number" {...form.register("adults")} />
          </label>
          <label className="text-sm text-[var(--color-ink-2)]">
            {"Ni\u00F1os"}
            <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" min={0} type="number" {...form.register("children")} />
          </label>
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
                  <span>
                    {pricingPreview.nights} {pricingPreview.nights === 1 ? "noche" : "noches"} x{" "}
                    {formatCurrency(pricingPreview.basePricePerNight, "ARS")}
                  </span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.subtotal, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Limpieza</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.cleaningFee, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[var(--color-rule)] pt-2 text-base">
                  <span className="font-semibold text-[var(--color-ink)]">Total estimado</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.total, "ARS")}</strong>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-ink-2)]">
                Elegí una unidad y completá check-in y check-out para ver el total antes de pagar.
              </p>
            )}
          </div>
          {form.formState.errors.checkOut ? <p className="text-sm text-[var(--color-danger)] md:col-span-2">{form.formState.errors.checkOut.message}</p> : null}
          {requestError ? <p className="text-sm text-[var(--color-danger)] md:col-span-2">{requestError}</p> : null}
          <div className="flex justify-end md:col-span-2">
            <Button className="rounded-[16px] px-6" type="submit">
              {form.formState.isSubmitting ? "Enviando c\u00F3digo..." : "Enviar c\u00F3digo de verificaci\u00F3n"}
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
                Total a pagar
              </p>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-ink-2)]">
                <div className="flex items-center justify-between gap-4">
                  <span>{selectedUnit.name}</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.subtotal, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Limpieza</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.cleaningFee, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[var(--color-rule)] pt-2 text-base">
                  <span className="font-semibold text-[var(--color-ink)]">Total final</span>
                  <strong className="text-[var(--color-ink)]">{formatCurrency(pricingPreview.total, "ARS")}</strong>
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
              {otpLoading ? "Validando..." : "Validar y continuar al pago"}
            </Button>
            <Button className="rounded-[16px] px-6" onClick={() => void handleOtpResend()} type="button" variant="outline">
              {resendLoading ? "Reenviando..." : "Reenviar c\u00F3digo"}
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

function PublicInquiryModal({
  onClose,
  open
}: {
  onClose: () => void;
  open: boolean;
}) {
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
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        throw new Error("inquiry_failed");
      }

      const data = (await response.json()) as { inquiryId: string; inquiry: Inquiry };
      setSubmittedId(data.inquiryId);
      persistInquiryToAdminDemo(data.inquiry);
      form.reset();
    } catch {
      setRequestError("No pudimos enviar tu consulta. Intenta nuevamente.");
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
    title = "Pol\u00EDticas";
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
    title = "T\u00E9rminos y condiciones";
    body = (
      <div className="space-y-4 text-[15px] leading-7 text-[var(--color-ink-2)]">
        <p>{"Las solicitudes enviadas desde esta web no garantizan una reserva inmediata. Toda reserva queda sujeta a confirmaci\u00F3n manual por parte del equipo."}</p>
        <p>{"La disponibilidad publicada es orientativa para fines de prueba. Las condiciones finales, precios y pol\u00EDticas se confirman por mensaje o email."}</p>
        <p>{"Al enviar un formulario, acept\u00E1s que podamos contactarte para completar la gesti\u00F3n de tu consulta o solicitud de reserva."}</p>
      </div>
    );
  }

  return (
    <ModalFrame onClose={onClose} open={open} title={title || "Informaci\u00F3n"}>
      {body}
    </ModalFrame>
  );
}

