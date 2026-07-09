import Link from "next/link";

import { siteSettings } from "@/data/mock-data";

import { Container } from "./container";

export function SiteFooter() {
  return (
    <footer className="border-t border-sand-200 bg-white py-12">
      <Container className="grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl text-night">Los {"\u00C1"}lamos Tilcara</p>
          <p className="mt-3 text-sm leading-6 text-sand-700">
            {"Hospedaje c\u00E1lido en Tilcara con reservas directas y gesti\u00F3n simple para cada estad\u00EDa."}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay">Contacto</p>
          <div className="mt-3 space-y-2 text-sm text-sand-700">
            <p>{siteSettings.phone}</p>
            <p>{siteSettings.email}</p>
            <p>{siteSettings.address}</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay">Canales</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-sand-700">
            <Link href={siteSettings.instagramUrl} target="_blank">
              Instagram
            </Link>
            <Link href={siteSettings.facebookUrl} target="_blank">
              Facebook
            </Link>
            <Link href="/admin/login">Admin</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
