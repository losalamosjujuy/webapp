import Link from "next/link";
import { Instagram, MessageCircle, Phone } from "lucide-react";

import { InquiryForm } from "@/components/booking/inquiry-form";
import { Container } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { buildGeneralInquiryMessage, buildWhatsappLink } from "@/lib/whatsapp/messages";
import type { SiteSettings } from "@/types/domain";

export function ContactSection({ siteSettings }: { siteSettings: SiteSettings }) {
  return (
    <section className="bg-night py-20 text-white">
      <Container className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading
            eyebrow="Contacto"
            title="Reservas directas y consultas por el canal que ya usa el negocio."
            description="La web empuja hacia WhatsApp sin perder trazabilidad: tambien deja formularios y registros que luego pueden convertirse en reservas."
          />
          <div className="mt-8 space-y-4 text-sm text-sand-200">
            <Link
              className="inline-flex items-center gap-3"
              href={buildWhatsappLink(siteSettings.whatsappNumber, buildGeneralInquiryMessage())}
              target="_blank"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp directo
            </Link>
            <Link className="inline-flex items-center gap-3" href={`tel:${siteSettings.phone}`}>
              <Phone className="h-4 w-4" />
              {siteSettings.phone}
            </Link>
            <Link className="inline-flex items-center gap-3" href={siteSettings.instagramUrl} target="_blank">
              <Instagram className="h-4 w-4" />
              Instagram
            </Link>
          </div>
        </div>
        <Card className="p-6">
          <InquiryForm />
        </Card>
      </Container>
    </section>
  );
}
