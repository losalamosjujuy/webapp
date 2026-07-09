import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dune px-6 py-20">
      <div className="max-w-lg rounded-3xl bg-white p-10 text-center shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-clay">
          Los Álamos Tilcara
        </p>
        <h1 className="mt-4 font-display text-4xl text-night">
          {"La p\u00E1gina que busc\u00E1s no est\u00E1 disponible."}
        </h1>
        <p className="mt-4 text-base text-sand-700">
          {"Volv\u00E9 al inicio para explorar alojamiento, disponibilidad y contacto directo."}
        </p>
        <Link
          className="mt-8 inline-flex rounded-full bg-night px-5 py-3 text-sm font-semibold text-white transition hover:bg-sand-800"
          href="/"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
