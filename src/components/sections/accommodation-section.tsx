import Image from "next/image";
import Link from "next/link";
import { BedDouble, ShowerHead, Users } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatCurrency } from "@/lib/utils/format";
import type { Unit } from "@/types/domain";

export function AccommodationSection({ units }: { units: Unit[] }) {
  return (
    <section className="py-20" id="alojamientos">
      <Container>
        <SectionHeading
          eyebrow="Alojamientos"
          title="Unidades simples de entender, faciles de reservar."
          description="Cada unidad expone capacidad, configuracion, amenities clave y una base de precio editable para que el negocio pueda empezar sin un PMS complejo."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {units.map((unit) => (
            <Card className="overflow-hidden" key={unit.id}>
              <div className="relative h-72">
                <Image alt={unit.images[0]?.altText ?? unit.name} fill src={unit.featuredImage} className="object-cover" />
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl text-night">{unit.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-sand-700">{unit.shortDescription}</p>
                  </div>
                  <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-clay">
                    Desde {formatCurrency(unit.basePricePerNight)}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-sand-700">
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4" /> {unit.maxGuests} huéspedes
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BedDouble className="h-4 w-4" /> {unit.beds}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <ShowerHead className="h-4 w-4" /> {unit.bathrooms} bano
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {unit.amenities.slice(0, 4).map((amenity) => (
                    <span className="rounded-full bg-mist px-3 py-1 text-xs text-sand-700" key={amenity.id}>
                      {amenity.name}
                    </span>
                  ))}
                </div>
                <Link className="mt-6 inline-flex text-sm font-semibold text-clay" href="#reservar">
                  Solicitar esta unidad
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
