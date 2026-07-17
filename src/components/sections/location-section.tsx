import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { SiteSettings } from "@/types/domain";

export function LocationSection({ siteSettings }: { siteSettings: SiteSettings }) {
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${siteSettings.coordinates.lat},${siteSettings.coordinates.lng}`;

  return (
    <section className="bg-white py-20" id="ubicacion">
      <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading
            eyebrow="Ubicación"
            title="Tilcara como base para explorar la Quebrada."
            description="El bloque puede iniciar con información breve, landmarks y CTA a mapas, y luego crecer con indicaciones detalladas y contenido local."
          />
          <div className="mt-8 space-y-4 text-sm text-sand-700">
            <p className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-clay" />
              {siteSettings.address}
            </p>
            <p>Referencia: cerca del centro de Tilcara y accesible para llegadas por ruta.</p>
            <Link className="inline-flex items-center gap-2 font-semibold text-clay" href={directionsHref} target="_blank">
              <Navigation className="h-4 w-4" />
              Obtener indicaciones
            </Link>
          </div>
        </div>
        <Card className="min-h-[360px] overflow-hidden">
          <iframe
            className="h-full min-h-[360px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${siteSettings.coordinates.lat},${siteSettings.coordinates.lng}&z=14&output=embed`}
            title="Mapa de Los Álamos Tilcara"
          />
        </Card>
      </Container>
    </section>
  );
}
