"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BedDouble, ChevronRight, ShowerHead, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { resolvePublicImage } from "@/lib/utils/images";
import type { Unit } from "@/types/domain";

function buildFallbackDetails(unit: Unit) {
  return [
    { label: "Capacidad", value: `Hasta ${unit.maxGuests} huespedes` },
    { label: "Dormitorios", value: `${unit.bedrooms}` },
    { label: "Banos", value: `${unit.bathrooms}` },
    { label: "Camas", value: unit.beds }
  ];
}

export function AccommodationModal({
  onClose,
  onReserve,
  open,
  unit
}: {
  onClose: () => void;
  onReserve: (unitId: string) => void;
  open: boolean;
  unit: Unit | null;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
  }, [onClose, open]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [unit?.id]);

  const images = useMemo(() => unit?.images.length ? unit.images : [], [unit]);
  const activeImage = images[activeImageIndex] ?? images[0];
  const details = unit?.details.length ? unit.details : unit ? buildFallbackDetails(unit) : [];
  const highlights = unit?.highlights.length ? unit.highlights : unit?.amenities.slice(0, 4).map((item) => item.name) ?? [];

  if (!open || !unit) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b140f]/70 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={unit.name}
    >
      <div
        className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[30px] bg-[#fcf7f1] shadow-[0_40px_120px_rgba(20,15,10,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eadfd2] bg-[#fcf7f1]/96 px-5 py-4 backdrop-blur sm:px-8">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Alojamiento</p>
            <h3 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-[#2b2118] sm:text-[34px]">{unit.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead3bd] text-[#8f5a2c]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-8 px-5 py-5 sm:px-8 sm:py-8 xl:grid-cols-[1.25fr_0.95fr]">
          <div>
            <div className="relative aspect-[1.16] overflow-hidden rounded-[26px] bg-[#eee5da]">
              <Image
                alt={activeImage?.altText || unit.name}
                fill
                src={resolvePublicImage(activeImage?.imageUrl, unit.featuredImage)}
                className="object-cover"
              />
            </div>
            {images.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative aspect-[1.05] overflow-hidden rounded-[18px] border ${index === activeImageIndex ? "border-[#ad6b38]" : "border-[#eadfd2]"}`}
                  >
                    <Image alt={image.altText || unit.name} fill src={resolvePublicImage(image.imageUrl, unit.featuredImage)} className="object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col">
            <div className="rounded-[24px] border border-[#eadfd2] bg-white px-5 py-5">
              <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#7c6757]">
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Hasta {unit.maxGuests} huespedes
                </span>
                <span className="inline-flex items-center gap-2">
                  <BedDouble className="h-4 w-4" />
                  {unit.beds}
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShowerHead className="h-4 w-4" />
                  {unit.bathrooms} bano(s)
                </span>
              </div>

              <p className="mt-4 text-[16px] leading-8 text-[#5f4f43]">{unit.description || unit.shortDescription}</p>

              {highlights.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {highlights.map((item) => (
                    <span key={item} className="rounded-full bg-[#f5ede3] px-3 py-1 text-[12px] font-semibold text-[#8f5a2c]">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[24px] border border-[#eadfd2] bg-white px-5 py-5">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Detalles</p>
                <div className="mt-4 space-y-3">
                  {details.map((detail) => (
                    <div key={`${detail.label}-${detail.value}`} className="border-b border-[#f0e6db] pb-3 last:border-b-0 last:pb-0">
                      <p className="text-[12px] uppercase tracking-[0.12em] text-[#9b7e6a]">{detail.label}</p>
                      <p className="mt-1 text-[15px] text-[#352920]">{detail.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#eadfd2] bg-white px-5 py-5">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Amenities</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {unit.amenities.map((amenity) => (
                    <span key={amenity.id} className="rounded-full border border-[#ead7c3] px-3 py-2 text-[13px] text-[#5f4f43]">
                      {amenity.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-[#e7d6c4] bg-[#f7efe4] px-5 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b77544]">Tarifa desde</p>
                  <p className="mt-2 text-[30px] font-semibold tracking-[-0.05em] text-[#2b2118]">
                    Desde {formatCurrency(unit.fromPricePerNight)}
                  </p>
                  <p className="mt-1 text-[13px] text-[#7c6757]">Precio segun cantidad de adultos.</p>
                  <p className="mt-1 text-[13px] text-[#7c6757]">Limpieza: {formatCurrency(unit.cleaningFee)}</p>
                </div>
                <Button
                  className="h-12 rounded-[14px] bg-[#9f6233] px-6 text-white hover:bg-[#8f5625]"
                  onClick={() => onReserve(unit.id)}
                  type="button"
                >
                  Solicitar esta unidad
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
