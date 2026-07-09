import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { JsonLd } from "@/components/layout/json-ld";
import { cn } from "@/lib/utils/cn";
import { buildMetadata, lodgingJsonLd } from "@/lib/seo/metadata";

import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = buildMetadata();

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={cn(displayFont.variable, bodyFont.variable)}>
        <JsonLd data={lodgingJsonLd} />
        {children}
      </body>
    </html>
  );
}
