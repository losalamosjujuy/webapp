import Link from "next/link";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  approved: {
    title: "Pago aprobado",
    body: "Recibimos tu pago correctamente. La reserva se confirmará automáticamente y quedará visible en el panel."
  },
  pending: {
    title: "Pago pendiente",
    body: "Mercado Pago marcó la operación como pendiente. Te avisaremos cuando el estado cambie."
  },
  failure: {
    title: "Pago no completado",
    body: "La operación no pudo completarse. Podés volver al sitio y reintentar el pago."
  }
};

export default function ReservationStatusPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const rawStatus = searchParams?.status;
  const status = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const content = STATUS_COPY[status ?? ""] ?? STATUS_COPY.pending;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
      <div className="rounded-[32px] border border-[#eadccf] bg-white p-10 shadow-[0_30px_80px_rgba(71,45,24,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8f5625]">
          Estado de reserva
        </p>
        <h1 className="mt-4 font-serif text-5xl tracking-[-0.04em] text-[#241b16]">
          {content.title}
        </h1>
        <p className="mt-6 text-lg leading-8 text-[#5f4f43]">{content.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-6 text-sm font-semibold text-white"
          >
            Volver al inicio
          </Link>
          <Link
            href="/admin/reservations"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#cfae92] px-6 text-sm font-semibold text-[#7d4d27]"
          >
            Ver reservas
          </Link>
        </div>
      </div>
    </main>
  );
}
