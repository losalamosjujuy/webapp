import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Trees } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Los Álamos",
  description: "Texto completo de los términos y condiciones de Los Álamos.",
  alternates: {
    canonical: "/terminos-y-condiciones"
  }
};

async function getTermsContent() {
  const filePath = path.join(process.cwd(), "docs", "TERMINOS.md");
  return readFile(filePath, "utf8");
}

export default async function TermsAndConditionsPage() {
  const termsContent = await getTermsContent();

  return (
    <main className="min-h-screen bg-[#f7f1e8] text-[#2d241c]">
      <div className="border-b border-[#dccfbe] bg-[#211a14] text-[#f7f1e8]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#f0e1cc] transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Inicio
          </Link>
          <div className="flex items-center gap-3">
            <Trees className="h-5 w-5 text-[#e7d6bd]" strokeWidth={1.6} />
            <span className="font-display text-2xl tracking-[-0.05em] text-white">Los Álamos</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <article className="rounded-[28px] border border-[#e4d8c9] bg-[#fffdfa] p-6 shadow-[0_18px_60px_rgba(59,43,28,0.08)] sm:p-8 lg:p-10">
          <pre className="font-body whitespace-pre-wrap break-words text-[15px] leading-8 text-[#3a2f26]">
            {termsContent}
          </pre>
        </article>
      </div>
    </main>
  );
}
