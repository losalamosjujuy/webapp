import { Star } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Testimonial } from "@/types/domain";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Testimonios"
          title="Componente listo para reemplazar placeholders por prueba social real."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {testimonials.map((testimonial) => (
            <Card className="p-8" key={testimonial.id}>
              <div className="flex gap-1 text-clay">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star className="h-4 w-4 fill-current" key={index} />
                ))}
              </div>
              <p className="mt-5 text-lg leading-8 text-night">&ldquo;{testimonial.quote}&rdquo;</p>
              <p className="mt-4 text-sm font-semibold text-sand-700">
                {testimonial.guestName} - {testimonial.source}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
