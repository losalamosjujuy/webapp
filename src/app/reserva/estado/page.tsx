import Link from "next/link";

import { PublicReservationLookupPanel } from "@/components/public/public-reservation-lookup-panel";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  approved: {
    title: "Pago aprobado",
    body: "Recibimos tu pago correctamente. Debajo puedes consultar el detalle y estado de tu reserva con tu email y el codigo que te enviamos."
  },
  pending: {
    title: "Pago pendiente",
    body: "Mercado Pago marco la operacion como pendiente. Puedes revisar el estado de la reserva aqui mismo con tu email y tu codigo."
  },
  failure: {
    title: "Pago no completado",
    body: "La operacion no pudo completarse. Si tienes un codigo de reserva, puedes revisar el estado desde esta misma pantalla."
  }
};

export default function ReservationStatusPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const rawStatus = searchParams?.status;
  const status = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const content = STATUS_COPY[status ?? ""] ?? {
    title: "Consulta privada de reserva",
    body: "Ingresa tu email y el codigo enviado por email para ver el estado actualizado de tu reserva."
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[32px] border border-[#eadccf] bg-white p-10 shadow-[0_30px_80px_rgba(71,45,24,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8f5625]">Estado de reserva</p>
          <h1 className="mt-4 font-serif text-5xl tracking-[-0.04em] text-[#241b16]">{content.title}</h1>
          <p className="mt-6 text-lg leading-8 text-[#5f4f43]">{content.body}</p>
          <p className="mt-4 text-sm leading-7 text-[#7a6759]">
            Por seguridad, solo mostramos la informacion cuando coinciden el email registrado y el codigo enviado por nuestro equipo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-6 text-sm font-semibold text-white"
            >
              Volver al inicio
            </Link>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#eadccf] bg-white p-8 shadow-[0_30px_80px_rgba(71,45,24,0.08)]">
          <PublicReservationLookupPanel />
        </section>
      </div>
    </main>
  );
}
