import Image from "next/image";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { propertyImages } from "@/data/property-images";
import { resolvePublicImage } from "@/lib/utils/images";
import type { Unit } from "@/types/domain";

export function GallerySection({ units }: { units: Unit[] }) {
  const images = units.flatMap((unit) =>
    unit.images.map((image) => ({ ...image, unitName: unit.name }))
  );

  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Galeria"
          title="Carga visual ligera, lista para crecer."
          description="La galeria usa imagenes optimizadas y puede migrar facilmente a Supabase Storage sin tocar la capa de presentacion."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <div
              className={index % 3 === 0 ? "relative min-h-80 overflow-hidden rounded-3xl md:col-span-2" : "relative min-h-80 overflow-hidden rounded-3xl"}
              key={image.id}
            >
              <Image
                alt={image.altText}
                fill
                src={resolvePublicImage(image.imageUrl, propertyImages.gallery)}
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
                <p className="text-sm">{image.unitName}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
