"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  GalleryHorizontal,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircleMore,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Warehouse
} from "lucide-react";

import { useAdmin } from "@/components/admin/admin-provider";
import { cn } from "@/lib/utils/cn";

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reservations", label: "Reservas", icon: ClipboardList },
  { href: "/admin/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/admin/inquiries", label: "Consultas", icon: MessageCircleMore },
  { href: "/admin/units", label: "Alojamientos", icon: Home },
  { href: "/admin/guests", label: "Hu\u00E9spedes", icon: Users },
  { href: "/admin/availability", label: "Disponibilidad", icon: CalendarRange },
  { href: "/admin/pricing", label: "Precios", icon: CircleDollarSign },
  { href: "/admin/content", label: "Contenido del sitio", icon: SlidersHorizontal },
  { href: "/admin/gallery", label: "Galer\u00EDa", icon: GalleryHorizontal },
  { href: "/admin/users", label: "Usuarios", icon: ShieldCheck },
  { href: "/admin/settings", label: "Configuraci\u00F3n", icon: Settings }
];

export function AdminShell({
  title,
  description,
  sectionNumber,
  action,
  children
}: {
  title: string;
  description: string;
  sectionNumber: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { state } = useAdmin();

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#1d1612]">
      <div className="flex min-h-screen items-center justify-center px-6 py-10 lg:hidden">
        <div className="w-full max-w-md rounded-[28px] border border-[#e6d7ca] bg-white p-8 text-center shadow-[0_24px_60px_rgba(76,50,28,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#d8c3ae] text-[#8b5324]">
            <Warehouse className="h-8 w-8" strokeWidth={1.4} />
          </div>
          <p className="mt-6 font-display text-[2.2rem] leading-none tracking-[-0.04em] text-[#201814]">Panel administrativo</p>
          <p className="mt-4 text-sm leading-7 text-[#6c5a4c]">
            El administrador está disponible solo en computadora. Abrilo desde una pantalla más grande para gestionar reservas, calendario y contenido.
          </p>
        </div>
      </div>

      <div className="hidden min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="flex flex-col bg-[linear-gradient(180deg,#181411_0%,#111111_100%)] px-4 py-6 text-white">
          <Link href="/" className="flex flex-col items-center gap-4 border-b border-white/10 pb-6 pt-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/18 text-[#f0dcc4]">
              <Warehouse className="h-8 w-8" strokeWidth={1.4} />
            </div>
            <div>
              <p className="font-display text-[2.5rem] leading-none tracking-[-0.04em]">Los {"\u00C1"}lamos</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.38em] text-white/58">
                Tilcara
              </p>
            </div>
          </Link>

          <div className="border-b border-white/10 py-6">
            <p className="text-[15px] font-semibold uppercase tracking-[0.08em]">Panel administrativo</p>
            <p className="mt-2 text-[13px] leading-6 text-white/62">Vista general de todas las secciones</p>
          </div>

          <nav className="mt-5 space-y-1.5">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-[13px] font-medium transition",
                    active
                      ? "bg-[linear-gradient(90deg,#8b5324_0%,#6e3f18_100%)] text-white shadow-[0_16px_34px_rgba(88,47,18,0.34)]"
                      : "text-white/82 hover:bg-white/6 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 pt-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[url('/images/pets.jpeg')] bg-cover bg-center" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Administrador</p>
                  <p className="truncate text-xs text-white/58">{state.settings.contactEmail}</p>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 text-white/54" />
              </div>
            </div>
            <form action="/api/admin-auth/logout" method="post">
              <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-white/82 transition hover:bg-white/6 hover:text-white">
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </aside>

        <div>
          <div className="px-5 py-5 sm:px-8 lg:px-10">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#8f5625] text-[11px] font-bold text-white">
                    {sectionNumber}
                  </span>
                  <h1 className="text-[2rem] font-semibold uppercase tracking-[-0.02em] text-[#201814] lg:text-[2.15rem]">
                    {title}
                  </h1>
                </div>
                <p className="mt-2 text-sm text-[#6c5a4c]">{description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e4d5c8] bg-white text-[#483629] shadow-[0_12px_30px_rgba(76,50,28,0.08)]">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#8f5625] text-[10px] font-semibold text-white">
                    3
                  </span>
                </button>
                <div className="inline-flex h-11 items-center gap-3 rounded-xl border border-[#e4d5c8] bg-white px-4 text-sm text-[#483629] shadow-[0_12px_30px_rgba(76,50,28,0.08)]">
                  <CalendarDays className="h-4 w-4" />
                  20 - 26 May, 2024
                  <ChevronDown className="h-4 w-4" />
                </div>
                {action}
              </div>
            </header>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
