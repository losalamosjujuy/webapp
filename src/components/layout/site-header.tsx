import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { buildGeneralInquiryMessage, buildWhatsappLink } from "@/lib/whatsapp/messages";
import type { SiteSettings } from "@/types/domain";

import { Container } from "./container";

export function SiteHeader({ siteSettings }: { siteSettings: SiteSettings }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-night/90 backdrop-blur">
      <Container className="flex h-20 items-center justify-between">
        <Link className="font-display text-2xl text-white" href="/">
          Los {"\u00C1"}lamos Tilcara
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-sand-100 md:flex">
          <Link href="#alojamientos">Alojamientos</Link>
          <Link href="#amenities">Amenities</Link>
          <Link href="#reservar">Reservar</Link>
          <Link href="#ubicacion">Ubicaci\u00F3n</Link>
        </nav>
        <Link
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-night"
          href={buildWhatsappLink(siteSettings.whatsappNumber, buildGeneralInquiryMessage())}
          target="_blank"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Link>
      </Container>
    </header>
  );
}
