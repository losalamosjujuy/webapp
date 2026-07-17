import type { Metadata } from "next";

const siteUrl = "https://losalamostilcara.com";
const title = "Los Álamos Tilcara | Hospedaje en Tilcara, Jujuy";
const description =
  "Hospedaje en Tilcara, Jujuy. Conocé nuestros alojamientos, servicios y ubicación. Consultá disponibilidad y organizá tu estadía directamente con Los Álamos.";
const openGraphDescription =
  "Conocé nuestros alojamientos en Tilcara y consultá disponibilidad directamente con nosotros.";

export function buildMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: "/"
    },
    openGraph: {
      title: "Los Álamos Tilcara | Descansá en la Quebrada",
      description: openGraphDescription,
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
