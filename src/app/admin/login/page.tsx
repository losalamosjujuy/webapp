import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function AdminLoginPage({
  searchParams
}: {
  searchParams?: {
    error?: string;
  };
}) {
  const errorMessage =
    searchParams?.error === "config"
      ? "Falta configurar Supabase en el servidor. Cargá las variables y aplicá la migración de seguridad antes de habilitar el admin."
      : searchParams?.error === "unauthorized"
        ? "La cuenta existe pero no tiene rol administrativo en public.profiles."
        : searchParams?.error === "invalid"
          ? "Credenciales inválidas."
          : searchParams?.error === "session"
            ? "Tu sesión no es válida o expiró."
            : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-dune px-6 py-20">
      <Card className="w-full max-w-md p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-clay">Admin access</p>
        <h1 className="mt-4 font-display text-4xl text-night">Ingreso del equipo</h1>
        <p className="mt-4 text-sm leading-7 text-sand-700">
          Acceso únicamente con usuarios reales de Supabase Auth que tengan rol `admin` o `staff`
          en `public.profiles`.
        </p>

        {errorMessage ? (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form action="/api/admin-auth/login" className="mt-8 space-y-4" method="post">
          <label className="block text-sm text-sand-700">
            Email
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-sand-200 bg-white px-4 text-night"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block text-sm text-sand-700">
            Password
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-sand-200 bg-white px-4 text-night"
              name="password"
              required
              type="password"
            />
          </label>
          <button className="inline-flex h-12 w-full items-center justify-center rounded-full bg-night px-5 text-sm font-semibold text-white">
            Ingresar al admin
          </button>
        </form>

        <div className="mt-8 rounded-3xl bg-sand-50 p-5 text-sm text-sand-700">
          <p>Checklist mínimo:</p>
          <p>1. Crear usuario en Supabase Auth.</p>
          <p>2. Asignarle rol en `public.profiles`.</p>
          <p>3. Configurar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.</p>
        </div>

        <Link className="mt-6 inline-flex text-sm font-semibold text-clay" href="/">
          Volver al sitio
        </Link>
      </Card>
    </main>
  );
}
