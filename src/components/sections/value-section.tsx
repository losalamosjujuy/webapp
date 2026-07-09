import { Leaf, MapPin, ShieldCheck, SunMedium } from "lucide-react";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

const pillars = [
  {
    title: "Ubicaci\u00F3n con ritmo local",
    copy: "Base c\u00F3moda para moverse entre Tilcara, senderos y gastronom\u00EDa regional.",
    icon: MapPin
  },
  {
    title: "Descanso real",
    copy: "Habitaciones serenas y una experiencia sin fricci\u00F3n para llegar, alojarse y volver.",
    icon: SunMedium
  },
  {
    title: "Atenci\u00F3n cercana",
    copy: "El canal directo por WhatsApp y la gesti\u00F3n manual cuidada reducen malentendidos.",
    icon: ShieldCheck
  },
  {
    title: "Naturaleza y pausa",
    copy: "Tonos, patios y vistas pensados para una marca peque\u00F1a con identidad del norte.",
    icon: Leaf
  }
];

export function ValueSection() {
  return (
    <section className="bg-white py-20">
      <Container>
        <SectionHeading
          eyebrow={"Por qu\u00E9 elegirnos"}
          title={"Una propuesta simple, humana y orientada a conversi\u00F3n."}
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {pillars.map(({ title, copy, icon: Icon }) => (
            <div className="rounded-3xl border border-sand-200 p-6" key={title}>
              <Icon className="h-6 w-6 text-clay" />
              <h3 className="mt-4 text-xl font-semibold text-night">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-sand-700">{copy}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
