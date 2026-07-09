import { Car, Mountain, Trees, Utensils, Wifi } from "lucide-react";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Unit } from "@/types/domain";

const iconMap = {
  wifi: Wifi,
  heater: Mountain,
  utensils: Utensils,
  car: Car,
  trees: Trees,
  mountain: Mountain
} as const;

export function AmenitiesSection({ units }: { units: Unit[] }) {
  const amenities = Array.from(new Map(units.flatMap((unit) => unit.amenities).map((amenity) => [amenity.id, amenity])).values());

  return (
    <section className="bg-white py-20" id="amenities">
      <Container>
        <SectionHeading
          eyebrow="Comodidades"
          title="Datos editables hoy, sin perder consistencia después."
          description="La estructura soporta amenities reutilizables por unidad y queda lista para editarse desde admin o desde contenido seed en la primera versión."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((amenity) => {
            const Icon = iconMap[amenity.icon as keyof typeof iconMap] ?? Mountain;

            return (
              <div
                className="rounded-3xl border border-sand-200 bg-mist p-6"
                key={amenity.id}
              >
                <Icon className="h-6 w-6 text-clay" />
                <h3 className="mt-4 text-lg font-semibold text-night">{amenity.name}</h3>
                <p className="mt-2 text-sm text-sand-700">
                  Categoría: {amenity.category}. Editable desde el modelo de datos sin cambiar el componente.
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
