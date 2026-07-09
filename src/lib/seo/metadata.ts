import type { Metadata } from "next";

const siteUrl = "https://losalamostilcara.com";
const title = "Los Álamos Tilcara | Hospedaje en Tilcara, Jujuy";
const description =
  "Hospedaje cálido en Tilcara, Jujuy. Consultá disponibilidad, enviá tu solicitud de reserva y organizá tu estadía en la Quebrada de Humahuaca.";

export function buildMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: "/"
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: "Los Álamos Tilcara",
      locale: "es_AR",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    },
    ...overrides
  };
}

export const lodgingJsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "Los Álamos Tilcara",
  description,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Tilcara",
    addressRegion: "Jujuy",
    addressCountry: "AR"
  },
  areaServed: "Quebrada de Humahuaca",
  url: siteUrl
};
