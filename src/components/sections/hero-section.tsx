import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { Container } from "@/components/layout/container";
import { buildGeneralInquiryMessage, buildWhatsappLink } from "@/lib/whatsapp/messages";
import type { LandingContent, SiteSettings } from "@/types/domain";

export function HeroSection({
  landingContent,
  siteSettings
}: {
  landingContent: LandingContent;
  siteSettings: SiteSettings;
}) {
  return (
    <section className="bg-plateau pb-20 pt-20 text-white">
      <Container className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sand-200">
            {landingContent.hero.eyebrow}
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-5xl leading-tight sm:text-6xl">
            {landingContent.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-sand-100">
            {landingContent.hero.subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-night transition hover:bg-sand-100"
              href="#reservar"
            >
              <CalendarDays className="h-4 w-4" />
              Consultar disponibilidad
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              href={buildWhatsappLink(siteSettings.whatsappNumber, buildGeneralInquiryMessage())}
              target="_blank"
            >
              WhatsApp directo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            {landingContent.hero.trustPoints.map((point) => (
              <span
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-sand-100"
                key={point}
              >
                {point}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sand-200">
            {landingContent.hero.eyebrow || "Desde Tilcara"}
          </p>
          <p className="mt-4 font-display text-3xl">
            {landingContent.hero.title}
          </p>
          <p className="mt-4 text-base leading-7 text-sand-100">
            {landingContent.hero.subtitle}
          </p>
        </div>
      </Container>
    </section>
  );
}
