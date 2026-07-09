"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  subMonths
} from "date-fns";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  Filter,
  ImagePlus,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  User,
  Users
} from "lucide-react";

import { useAdmin } from "@/components/admin/admin-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type {
  AdminAvailabilityBlock,
  AdminFaqItem,
  AdminGalleryItem,
  AdminGuest,
  AdminInquiry,
  AdminPolicyItem,
  AdminPriceSeason,
  AdminReservation,
  AdminReservationStatus,
  AdminSettings,
  AdminSiteContent,
  AdminUnit,
  AdminUser,
  GalleryCategory
} from "@/types/admin";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

async function uploadAdminFiles({
  files,
  scope,
  entityId
}: {
  files: File[];
  scope: string;
  entityId?: string;
}) {
  if (!files.length) {
    return [];
  }

  const formData = new FormData();
  formData.set("scope", scope);

  if (entityId) {
    formData.set("entityId", entityId);
  }

  files.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/admin/media", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("upload_failed");
  }

  const data = await response.json();
  return data.uploads as Array<{ url: string; path: string; fileName: string }>;
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(
    1,
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
  );
}

function overlaps(date: string, startDate: string, endDate: string) {
  return date >= startDate && date < endDate;
}

function statusTone(status: string) {
  switch (status) {
    case "approved":
    case "confirmed":
    case "completed":
    case "resolved":
    case "active":
    case "frequent":
      return "bg-[#ebf8ee] text-[#2f8b4b]";
    case "pending_payment":
    case "verified_pending_payment":
    case "pending":
    case "pending_verification":
    case "new":
    case "in_progress":
    case "authorized":
    case "in_process":
      return "bg-[#fff2e6] text-[#c87017]";
    case "cancelled":
    case "canceled":
    case "rejected":
    case "expired":
    case "inactive":
    case "maintenance":
      return "bg-[#fdecec] text-[#d65045]";
    default:
      return "bg-[#efefef] text-[#6a5a4d]";
  }
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace("approved", "Aprobado")
    .replace("verified pending payment", "Verificada / pago pendiente")
    .replace("pending payment", "Pago pendiente")
    .replace("pending verification", "Verificación pendiente")
    .replace("confirmed", "Confirmada")
    .replace("pending", "Pendiente")
    .replace("cancelled", "Cancelada")
    .replace("canceled", "Cancelada")
    .replace("completed", "Completada")
    .replace("rejected", "Rechazada")
    .replace("expired", "Expirada")
    .replace("authorized", "Autorizado")
    .replace("in process", "En proceso")
    .replace("new", "Nueva")
    .replace("resolved", "Respondida")
    .replace("in progress", "En proceso")
    .replace("active", "Activo")
    .replace("inactive", "Inactivo")
    .replace("maintenance", "Mantenimiento")
    .replace("draft", "Borrador")
    .replace("frequent", "Frecuente");
}

function DashboardMetrics() {
  const { state } = useAdmin();
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalReservations = state.reservations.filter((reservation) => new Date(reservation.checkIn) <= monthEnd).length;
  const pending = state.reservations.filter(
    (reservation) =>
      reservation.status === "pending" ||
      reservation.status === "pending_payment" ||
      reservation.status === "verified_pending_payment" ||
      reservation.status === "pending_verification"
  ).length;
  const confirmed = state.reservations.filter(
    (reservation) => reservation.status === "confirmed" || reservation.status === "completed"
  ).length;
  const cancelled = state.reservations.filter(
    (reservation) => reservation.status === "canceled" || reservation.status === "rejected"
  ).length;
  const guests = state.guests.length;
  const revenue = state.payments
    .filter((payment) => payment.status === "approved")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const soldNights = state.reservations.reduce((sum, reservation) => {
    if (!["confirmed", "completed", "no_show"].includes(reservation.status)) {
      return sum;
    }

    const start = new Date(reservation.checkIn);
    const end = new Date(reservation.checkOut);
    const overlapStart = start > monthStart ? start : monthStart;
    const overlapEnd = end < monthEnd ? end : monthEnd;

    if (overlapStart >= overlapEnd) {
      return sum;
    }

    return sum + nightsBetween(overlapStart.toISOString(), overlapEnd.toISOString());
  }, 0);
  const occupancy = state.units.length
    ? Math.round((soldNights / (state.units.length * daysInMonth.length)) * 100)
    : 0;

  return [
    { label: "Reservas totales", value: totalReservations, helper: "+ 12% vs. semana pasada", tone: "text-[#2f8b4b]" },
    { label: "Pendientes", value: pending, helper: "Pendientes o pago en curso", tone: "text-[#c87017]" },
    { label: "Confirmadas", value: confirmed, helper: "Esta semana", tone: "text-[#2f8b4b]" },
    { label: "Canceladas", value: cancelled, helper: "Esta semana", tone: "text-[#d65045]" },
    { label: "Huéspedes", value: guests, helper: "Esta semana", tone: "text-[#2576d9]" },
    { label: "Ocupación", value: `${occupancy}%`, helper: "Mes actual", tone: "text-[#2f8b4b]" },
    { label: "Ingresos cobrados", value: formatCurrency(revenue, "ARS"), helper: "Pagos aprobados", tone: "text-[#2f8b4b]" }
  ];
}

function OccupancyGrid({
  month,
  onMonthChange
}: {
  month: Date;
  onMonthChange?: (next: Date) => void;
}) {
  const { state } = useAdmin();
  const dates = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month)
  });

  return (
    <div className="overflow-hidden rounded-[26px] border border-[#eadccf] bg-white shadow-[0_18px_50px_rgba(71,45,24,0.06)]">
      <div className="flex items-center justify-between border-b border-[#efe3d8] px-6 py-5">
        <div>
          <h3 className="text-xl font-semibold text-[#241b16]">Calendario de ocupacion</h3>
          <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-[#6b5a4d]">
            <LegendDot color="bg-[#a66835]" label="Confirmado" />
            <LegendDot color="bg-[#deb477]" label="Pago pendiente" />
            <LegendDot color="bg-[#88c77d]" label="Disponible" />
            <LegendDot color="bg-[#dcdcdc]" label="Bloqueado" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onMonthChange ? (
            <>
              <button
                onClick={() => onMonthChange(subMonths(month, 1))}
                className="rounded-xl border border-[#eadccf] bg-white p-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => onMonthChange(addMonths(month, 1))}
                className="rounded-xl border border-[#eadccf] bg-white p-3"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
          <Link
            href="/admin/calendar"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#cfae92] px-5 text-sm font-semibold text-[#7d4d27]"
          >
            Ver calendario completo
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-6">
        <div
          className="grid min-w-[1100px] gap-3"
          style={{ gridTemplateColumns: `190px repeat(${dates.length}, minmax(42px, 1fr))` }}
        >
          <div className="text-sm text-[#6b5a4d]">{format(month, "MMMM yyyy")}</div>
          {dates.map((date) => (
            <div key={date.toISOString()} className="text-center text-sm">
              <p className="font-semibold text-[#2c211a]">{format(date, "d")}</p>
              <p className="mt-1 text-[#7b6a5f]">
                {format(date, "EE")}
              </p>
            </div>
          ))}

          {state.units.map((unit) => (
            <div
              key={unit.id}
              className="contents"
            >
              <div key={`${unit.id}-label`} className="flex items-center gap-3 rounded-2xl border border-[#f0e5db] p-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-xl">
                  <Image alt={unit.name} fill src={unit.image} className="object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#241b16]">{unit.name}</p>
                  <p className="text-xs text-[#7a6759]">{unit.capacity} huéspedes</p>
                </div>
              </div>
              {dates.map((date) => {
                const isoDate = format(date, "yyyy-MM-dd");
                const inventory = state.inventory.find(
                  (item) => item.accommodationId === unit.id && item.date === isoDate
                );
                const blocked = state.availabilityBlocks.some(
                  (block) => block.accommodationId === unit.id && overlaps(isoDate, block.startDate, block.endDate)
                );
                const confirmed = state.reservations.some(
                  (reservation) =>
                    reservation.accommodationId === unit.id &&
                    ["confirmed", "completed", "no_show"].includes(reservation.status) &&
                    overlaps(isoDate, reservation.checkIn, reservation.checkOut)
                );
                const pendingPayment = state.reservations.some(
                  (reservation) =>
                    reservation.accommodationId === unit.id &&
                    ["pending_payment", "verified_pending_payment"].includes(reservation.status) &&
                    overlaps(isoDate, reservation.checkIn, reservation.checkOut)
                );
                const unavailableByInventory =
                  inventory?.stopSell || (inventory && inventory.availableUnits <= 0);
                const tone = blocked || unavailableByInventory
                  ? "bg-[#dcdcdc]"
                  : confirmed
                    ? "bg-[#a66835]"
                    : pendingPayment
                      ? "bg-[#deb477]"
                      : "bg-[#88c77d]";

                return <div key={`${unit.id}-${isoDate}`} className={cn("h-[42px] rounded-xl", tone)} title={isoDate} />;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueChart() {
  const { state } = useAdmin();
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return format(date, "yyyy-MM-dd");
  });
  const values = days.map((day) =>
    state.payments
      .filter((payment) => payment.status === "approved" && payment.paidAt?.slice(0, 10) === day)
      .reduce((sum, payment) => sum + payment.amount, 0)
  );
  const maxValue = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <SectionCard
      title="Ingresos (ultimos 7 dias)"
      action={<span className="text-sm font-semibold text-[#2f8b4b]">Pagos reales</span>}
    >
      <p className="text-[2rem] font-semibold tracking-[-0.04em] text-[#241b16]">{formatCurrency(total, "ARS")}</p>
      <div className="mt-6 grid grid-cols-[44px_1fr] gap-4">
        <div className="space-y-7 text-xs text-[#8b7a6e]">
          <p>{formatCurrency(maxValue, "ARS")}</p>
          <p>{formatCurrency(maxValue * 0.66, "ARS")}</p>
          <p>{formatCurrency(maxValue * 0.33, "ARS")}</p>
          <p>$ 0</p>
        </div>
        <div className="relative h-52 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#fffaf4_0%,#fbf6ef_100%)]">
          <div className="absolute inset-0 grid grid-rows-4 border-l border-[#ebdfd4]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="border-t border-dashed border-[#e6d8ca]" />
            ))}
          </div>
          <div className="absolute inset-x-6 bottom-4 top-6 flex items-end gap-3">
            {values.map((value, index) => (
              <div key={index} className="flex-1">
                <div
                  className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,rgba(164,103,52,0.18)_0%,rgba(164,103,52,0.65)_100%)]"
                  style={{ height: `${Math.max(14, (value / maxValue) * 220)}px` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 text-xs text-[#8b7a6e]">
        {days.map((label) => (
          <span key={label}>{format(new Date(label), "dd MMM")}</span>
        ))}
      </div>
    </SectionCard>
  );
}

function SectionCard({
  title,
  action,
  children,
  className
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[20px] border border-[#eadccf] bg-white p-5 shadow-[0_14px_34px_rgba(71,45,24,0.05)]", className)}>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#241b16]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-full", color)} />
      <span>{label}</span>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", statusTone(value))}>
      {statusLabel(value)}
    </span>
  );
}

function Toolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  filterOptions,
  actionLabel,
  onAction
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  filterOptions: Array<{ value: string; label: string }>;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7668]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar..."
            className="h-12 w-full rounded-xl border border-[#e7d8ca] bg-white pl-11 pr-4 text-sm text-[#2c211a]"
          />
        </div>
        <div className="relative min-w-[220px]">
          <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7668]" />
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            className="h-12 w-full appearance-none rounded-xl border border-[#e7d8ca] bg-white pl-11 pr-10 text-sm text-[#2c211a]"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={onAction}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(88,47,18,0.25)]"
      >
        <Plus className="h-4 w-4" />
        {actionLabel}
      </button>
    </div>
  );
}

function Table({
  headers,
  children
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#eadccf] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#fcfaf8] text-left text-[#7f6a5a]">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.06em]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
  extra
}: {
  onEdit: () => void;
  onDelete: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {extra}
      <button onClick={onEdit} className="rounded-lg p-2 text-[#7a6759] transition hover:bg-[#f6efe8] hover:text-[#6d3d18]">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="rounded-lg p-2 text-[#7a6759] transition hover:bg-[#fdeeee] hover:text-[#c1473d]">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#170f0b]/50 p-4">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-[0_30px_100px_rgba(23,15,11,0.25)]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-[#241b16]">{title}</h3>
          <button onClick={onClose} className="rounded-xl border border-[#eadccf] px-4 py-2 text-sm">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#4b392c]">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-11 w-full rounded-xl border border-[#e7d8ca] px-4 text-sm text-[#241b16]", props.className)} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-[120px] w-full rounded-xl border border-[#e7d8ca] px-4 py-3 text-sm text-[#241b16]", props.className)} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("h-11 w-full rounded-xl border border-[#e7d8ca] px-4 text-sm text-[#241b16]", props.className)} />;
}

export function AdminDashboardSection() {
  const { state } = useAdmin();
  const metrics = DashboardMetrics();
  const [month, setMonth] = useState(startOfMonth(new Date()));

  return (
    <AdminShell
      title="Dashboard"
      description="Bienvenido. Aqui tienes el resumen general de tu alojamiento."
      sectionNumber="01"
    >
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="grid gap-4 xl:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-[24px] border border-[#eadccf] bg-white p-5 shadow-[0_18px_50px_rgba(71,45,24,0.06)]">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#faf1e7] text-[#8f5625]">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="text-base text-[#46362b]">{metric.label}</p>
              <p className="mt-4 text-[2.2rem] font-semibold tracking-[-0.04em] text-[#241b16]">{metric.value}</p>
              <p className={cn("mt-3 text-sm", metric.tone)}>{metric.helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1.1fr]">
          <OccupancyGrid month={month} onMonthChange={setMonth} />
          <SectionCard title="Reservas recientes" action={<Link href="/admin/reservations" className="text-sm font-semibold text-[#8f5625]">Ver todas</Link>}>
            <div className="space-y-4">
              {state.reservations.slice(0, 5).map((reservation) => (
                <div key={reservation.id} className="flex items-center gap-4 rounded-2xl border border-[#f1e5da] px-3 py-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f8eee3] text-[#8f5625]">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#241b16]">{reservation.guestName}</p>
                    <p className="truncate text-sm text-[#7b695d]">{reservation.accommodationName}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge value={reservation.status} />
                    <p className="mt-2 text-xs text-[#7b695d]">
                      {formatDate(reservation.checkIn, "dd MMM")} - {formatDate(reservation.checkOut, "dd MMM")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1.1fr_1fr]">
          <SectionCard title="Consultas recientes" action={<Link href="/admin/inquiries" className="text-sm font-semibold text-[#8f5625]">Ver todas</Link>}>
            <div className="space-y-4">
              {state.inquiries.slice(0, 4).map((inquiry) => (
                <div key={inquiry.id} className="flex items-start gap-4 rounded-2xl border border-[#f1e5da] px-4 py-4">
                  <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#eef7ed] text-[#2f8b4b]">
                    {inquiry.channel === "Email" ? <Mail className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#241b16]">{inquiry.name}</p>
                    <p className="text-sm text-[#7b695d]">{inquiry.channel}</p>
                    <p className="mt-2 text-sm text-[#615145]">{inquiry.subject}</p>
                  </div>
                  <StatusBadge value={inquiry.status} />
                </div>
              ))}
            </div>
          </SectionCard>
          <RevenueChart />
          <SectionCard title="Alojamientos" action={<Link href="/admin/units" className="text-sm font-semibold text-[#8f5625]">Gestionar</Link>}>
            <div className="space-y-4">
              {state.units.map((unit) => (
                <div key={unit.id} className="flex items-center gap-4 rounded-2xl border border-[#f1e5da] px-3 py-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                    <Image alt={unit.name} fill src={unit.image} className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#241b16]">{unit.name}</p>
                    <p className="text-sm text-[#7b695d]">Capacidad: {unit.capacity} huéspedes</p>
                  </div>
                  <StatusBadge value={unit.status} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </AdminShell>
  );
}

export function ReservationsSection() {
  const { state, updateReservation, deleteReservation } = useAdmin();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<AdminReservation | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      state.reservations.filter((reservation) => {
        const matchesSearch =
          reservation.guestName.toLowerCase().includes(search.toLowerCase()) ||
          reservation.accommodationName.toLowerCase().includes(search.toLowerCase()) ||
          reservation.id.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === "all" || reservation.status === status;

        return matchesSearch && matchesStatus;
      }),
    [search, state.reservations, status]
  );

  async function saveReservation(formData: FormData) {
    const accommodationId = formData.get("accommodationId")?.toString() ?? "";
    const unit = state.units.find((item) => item.id === accommodationId);
    const next: AdminReservation = {
      id: editing?.id ?? "",
      guestName: formData.get("guestName")?.toString() ?? "",
      guestEmail: formData.get("guestEmail")?.toString() ?? "",
      guestPhone: formData.get("guestPhone")?.toString() ?? "",
      accommodationId,
      accommodationName: unit?.name ?? "",
      checkIn: formData.get("checkIn")?.toString() ?? "",
      checkOut: formData.get("checkOut")?.toString() ?? "",
      guests: Number(formData.get("guests")?.toString() ?? 1),
      total: Number(formData.get("total")?.toString() ?? 0),
      status: (formData.get("status")?.toString() ?? "pending") as AdminReservationStatus,
      source: formData.get("source")?.toString() ?? "Web",
      notes: formData.get("notes")?.toString() ?? ""
    };

    await updateReservation(next);
    setOpen(false);
    setEditing(null);
  }

  return (
    <AdminShell
      title="Reservas"
      description="Gestiona todas las reservas y el flujo de seguimiento."
      sectionNumber="02"
    >
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          filter={status}
          onFilterChange={setStatus}
          filterOptions={[
            { value: "all", label: "Todos los estados" },
            { value: "pending", label: "Pendientes" },
            { value: "pending_payment", label: "Pago pendiente" },
            { value: "verified_pending_payment", label: "Verificada / pago pendiente" },
            { value: "confirmed", label: "Confirmadas" },
            { value: "canceled", label: "Canceladas" }
          ]}
          actionLabel="Nueva reserva"
          onAction={() => {
            setEditing(null);
            setOpen(true);
          }}
        />
        <Table headers={["ID", "Huésped", "Alojamiento", "Fechas", "Huéspedes", "Estado", "Total", "Acciones"]}>
          {filtered.map((reservation) => (
            <tr key={reservation.id} className="border-t border-[#f0e5db]">
              <td className="px-5 py-4 text-[#7b695d]">{reservation.id}</td>
              <td className="px-5 py-4">
                <p className="font-semibold text-[#241b16]">{reservation.guestName}</p>
                <p className="text-[#7b695d]">{reservation.guestEmail}</p>
              </td>
              <td className="px-5 py-4 text-[#46362b]">{reservation.accommodationName}</td>
              <td className="px-5 py-4 text-[#46362b]">
                {formatDate(reservation.checkIn, "dd MMM")} - {formatDate(reservation.checkOut, "dd MMM")}
              </td>
              <td className="px-5 py-4 text-[#46362b]">{reservation.guests}</td>
              <td className="px-5 py-4"><StatusBadge value={reservation.status} /></td>
              <td className="px-5 py-4 font-semibold text-[#241b16]">{formatCurrency(reservation.total, "ARS")}</td>
              <td className="px-5 py-4">
                <RowActions
                  onEdit={() => {
                    setEditing(reservation);
                    setOpen(true);
                  }}
                  onDelete={() => void deleteReservation(reservation.id)}
                  extra={
                    <button className="rounded-lg p-2 text-[#7a6759] transition hover:bg-[#f6efe8]">
                      <Eye className="h-4 w-4" />
                    </button>
                  }
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
      <ReservationModal
        editing={editing}
        open={open}
        units={state.units}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSave={saveReservation}
      />
    </AdminShell>
  );
}

function ReservationModal({
  editing,
  open,
  units,
  onClose,
  onSave
}: {
  editing: AdminReservation | null;
  open: boolean;
  units: AdminUnit[];
  onClose: () => void;
  onSave: (formData: FormData) => void;
}) {
  return (
    <Modal open={open} title={editing ? "Editar reserva" : "Nueva reserva"} onClose={onClose}>
      <form
        action={(formData) => onSave(formData)}
        className="grid gap-4 md:grid-cols-2"
      >
        <Field label="Nombre">
          <Input name="guestName" defaultValue={editing?.guestName} required />
        </Field>
        <Field label="Email">
          <Input name="guestEmail" type="email" defaultValue={editing?.guestEmail} required />
        </Field>
        <Field label="Teléfono">
          <Input name="guestPhone" defaultValue={editing?.guestPhone} required />
        </Field>
        <Field label="Alojamiento">
          <Select name="accommodationId" defaultValue={editing?.accommodationId ?? units[0]?.id} required>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Check-in">
          <Input name="checkIn" type="date" defaultValue={editing?.checkIn} required />
        </Field>
        <Field label="Check-out">
          <Input name="checkOut" type="date" defaultValue={editing?.checkOut} required />
        </Field>
        <Field label="Huéspedes">
          <Input name="guests" type="number" min={1} defaultValue={editing?.guests ?? 2} required />
        </Field>
        <Field label="Total">
          <Input name="total" type="number" min={0} defaultValue={editing?.total ?? 0} required />
        </Field>
        <Field label="Estado">
          <Select name="status" defaultValue={editing?.status ?? "pending"}>
            <option value="pending">Pendiente</option>
            <option value="pending_payment">Pago pendiente</option>
            <option value="verified_pending_payment">Verificada / pago pendiente</option>
            <option value="confirmed">Confirmada</option>
            <option value="canceled">Cancelada</option>
            <option value="completed">Completada</option>
          </Select>
        </Field>
        <Field label="Origen">
          <Input name="source" defaultValue={editing?.source ?? "Web"} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Notas">
            <Textarea name="notes" defaultValue={editing?.notes} />
          </Field>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white">
            <Save className="h-4 w-4" />
            Guardar reserva
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CalendarSection() {
  const [month, setMonth] = useState(startOfMonth(new Date()));

  return (
    <AdminShell
      title="Calendario / Ocupación"
      description="Visualiza disponibilidad y reservas por fecha."
      sectionNumber="03"
    >
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[#6c5a4c]">
            <button
              onClick={() => setMonth(subMonths(month, 1))}
              className="rounded-xl border border-[#eadccf] bg-white p-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMonth(addMonths(month, 1))}
              className="rounded-xl border border-[#eadccf] bg-white p-3"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMonth(startOfMonth(new Date()))}
              className="rounded-xl border border-[#eadccf] bg-white px-4 py-3 text-sm font-semibold"
            >
              Hoy
            </button>
          </div>
          <div className="rounded-xl border border-[#eadccf] bg-white px-4 py-3 text-sm font-semibold text-[#6d3d18]">
            {format(month, "MMMM yyyy")}
          </div>
        </div>
        <OccupancyGrid month={month} />
      </div>
    </AdminShell>
  );
}

export function GuestsSection() {
  const { state, updateGuest, deleteGuest } = useAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<AdminGuest | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = state.guests.filter((guest) => {
    const matchesSearch =
      guest.name.toLowerCase().includes(search.toLowerCase()) ||
      guest.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || guest.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <AdminShell title="Huéspedes" description="Gestiona la base de huéspedes." sectionNumber="04">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={[
            { value: "all", label: "Todos" },
            { value: "frequent", label: "Frecuentes" },
            { value: "new", label: "Nuevos" }
          ]}
          actionLabel="Nuevo huésped"
          onAction={() => {
            setEditing(null);
            setOpen(true);
          }}
        />
        <Table headers={["Nombre", "Email", "Teléfono", "Ciudad", "Reservas", "Estado", "Acciones"]}>
          {filtered.map((guest) => (
            <tr key={guest.id} className="border-t border-[#f0e5db]">
              <td className="px-5 py-4 font-semibold text-[#241b16]">{guest.name}</td>
              <td className="px-5 py-4 text-[#7b695d]">{guest.email}</td>
              <td className="px-5 py-4 text-[#46362b]">{guest.phone}</td>
              <td className="px-5 py-4 text-[#46362b]">{guest.city}</td>
              <td className="px-5 py-4 text-[#46362b]">{guest.reservationsCount}</td>
              <td className="px-5 py-4"><StatusBadge value={guest.status} /></td>
              <td className="px-5 py-4">
                <RowActions
                  onEdit={() => {
                    setEditing(guest);
                    setOpen(true);
                  }}
                  onDelete={() => deleteGuest(guest.id)}
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
      <Modal open={open} title={editing ? "Editar huésped" : "Nuevo huésped"} onClose={() => setOpen(false)}>
        <form
          action={(formData) => {
            updateGuest({
              id: editing?.id ?? createId("guest"),
              name: formData.get("name")?.toString() ?? "",
              email: formData.get("email")?.toString() ?? "",
              phone: formData.get("phone")?.toString() ?? "",
              city: formData.get("city")?.toString() ?? "",
              reservationsCount: Number(formData.get("reservationsCount")?.toString() ?? 0),
              status: (formData.get("status")?.toString() ?? "new") as AdminGuest["status"]
            });
            setOpen(false);
            setEditing(null);
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="Nombre"><Input name="name" defaultValue={editing?.name} required /></Field>
          <Field label="Email"><Input name="email" type="email" defaultValue={editing?.email} required /></Field>
          <Field label="Teléfono"><Input name="phone" defaultValue={editing?.phone} required /></Field>
          <Field label="Ciudad"><Input name="city" defaultValue={editing?.city} required /></Field>
          <Field label="Reservas"><Input name="reservationsCount" type="number" min={0} defaultValue={editing?.reservationsCount ?? 0} required /></Field>
          <Field label="Estado">
            <Select name="status" defaultValue={editing?.status ?? "new"}>
              <option value="new">Nuevo</option>
              <option value="frequent">Frecuente</option>
            </Select>
          </Field>
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Guardar huésped
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export function UnitsSection() {
  const { state, updateUnit, deleteUnit } = useAdmin();
  const [editing, setEditing] = useState<AdminUnit | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AdminShell title="Alojamientos" description="Gestiona tus unidades y habitaciones." sectionNumber="05">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Nuevo alojamiento
          </button>
        </div>
        <div className="space-y-4">
          {state.units.map((unit) => (
            <div key={unit.id} className="grid gap-4 rounded-[24px] border border-[#eadccf] bg-white p-4 shadow-[0_18px_50px_rgba(71,45,24,0.06)] lg:grid-cols-[120px_1fr_auto] lg:items-center">
              <div className="relative aspect-[4/3] h-24 overflow-hidden rounded-2xl bg-[#f6efe8]">
                <Image alt={unit.name} fill src={unit.image} className="object-cover" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-[#241b16]">{unit.name}</h3>
                  <StatusBadge value={unit.status} />
                </div>
                <p className="mt-2 text-sm text-[#7b695d]">
                  {unit.capacity} huéspedes · {unit.beds}
                </p>
                <p className="mt-3 text-sm text-[#5f4f43]">{unit.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-semibold text-[#241b16]">{formatCurrency(unit.price, "ARS")}</p>
                  <p className="text-xs text-[#7b695d]">/ noche</p>
                </div>
                <RowActions
                  onEdit={() => {
                    setEditing(unit);
                    setOpen(true);
                  }}
                  onDelete={() => void deleteUnit(unit.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal open={open} title={editing ? "Editar alojamiento" : "Nuevo alojamiento"} onClose={() => setOpen(false)}>
        <form
          action={async (formData) => {
            const files = formData
              .getAll("images")
              .filter((entry): entry is File => entry instanceof File && entry.size > 0);
            const uploads = await uploadAdminFiles({
              files,
              scope: "units",
              entityId: editing?.id
            });

            await updateUnit({
              id: editing?.id ?? createId("unit"),
              name: formData.get("name")?.toString() ?? "",
              capacity: Number(formData.get("capacity")?.toString() ?? 1),
              beds: formData.get("beds")?.toString() ?? "",
              price: Number(formData.get("price")?.toString() ?? 0),
              image: editing?.image ?? uploads[0]?.url ?? "",
              images: editing?.images ?? [],
              uploads,
              status: (formData.get("status")?.toString() ?? "active") as AdminUnit["status"],
              description: formData.get("description")?.toString() ?? ""
            });
            setOpen(false);
            setEditing(null);
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="Nombre"><Input name="name" defaultValue={editing?.name} required /></Field>
          <Field label="Capacidad"><Input name="capacity" type="number" min={1} defaultValue={editing?.capacity ?? 2} required /></Field>
          <Field label="Camas"><Input name="beds" defaultValue={editing?.beds} required /></Field>
          <Field label="Precio"><Input name="price" type="number" min={0} defaultValue={editing?.price ?? 0} required /></Field>
          <div className="md:col-span-2">
            <Field label="Imágenes">
              <input
                name="images"
                type="file"
                accept="image/*"
                multiple
                className="block w-full rounded-xl border border-[#e7d8ca] px-4 py-3 text-sm text-[#241b16]"
              />
            </Field>
            <p className="mt-2 text-xs text-[#7b695d]">
              Sube varias imagenes. El sitio las mostrara con el mismo formato visual.
            </p>
            {editing?.images?.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {editing.images.map((image) => (
                  <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#eadccf]">
                    <Image alt={image.altText || editing.name} fill src={image.url} className="object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <Field label="Estado">
            <Select name="status" defaultValue={editing?.status ?? "active"}>
              <option value="active">Activo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="draft">Borrador</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Descripcion"><Textarea name="description" defaultValue={editing?.description} /></Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Guardar alojamiento
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export function AvailabilitySection() {
  const { state, updateAvailabilityBlock, deleteAvailabilityBlock } = useAdmin();
  const [editing, setEditing] = useState<AdminAvailabilityBlock | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AdminShell title="Disponibilidad / Bloqueos" description="Bloquea fechas y configura disponibilidad." sectionNumber="06">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Bloquear fechas
          </button>
        </div>
        <Table headers={["Alojamiento", "Desde", "Hasta", "Motivo", "Creado por", "Acciones"]}>
          {state.availabilityBlocks.map((block) => (
            <tr key={block.id} className="border-t border-[#f0e5db]">
              <td className="px-5 py-4 font-semibold text-[#241b16]">{block.accommodationName}</td>
              <td className="px-5 py-4 text-[#46362b]">{formatDate(block.startDate)}</td>
              <td className="px-5 py-4 text-[#46362b]">{formatDate(block.endDate)}</td>
              <td className="px-5 py-4 text-[#46362b]">{block.reason}</td>
              <td className="px-5 py-4 text-[#7b695d]">{block.createdBy}</td>
              <td className="px-5 py-4">
                <RowActions
                  onEdit={() => {
                    setEditing(block);
                    setOpen(true);
                  }}
                  onDelete={() => void deleteAvailabilityBlock(block.id)}
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
      <Modal open={open} title={editing ? "Editar bloqueo" : "Nuevo bloqueo"} onClose={() => setOpen(false)}>
        <form
          action={async (formData) => {
            const accommodationId = formData.get("accommodationId")?.toString() ?? "";
            const unit = state.units.find((item) => item.id === accommodationId);
            await updateAvailabilityBlock({
              id: editing?.id ?? createId("blk"),
              accommodationId,
              accommodationName: unit?.name ?? "",
              startDate: formData.get("startDate")?.toString() ?? "",
              endDate: formData.get("endDate")?.toString() ?? "",
              reason: formData.get("reason")?.toString() ?? "",
              createdBy: formData.get("createdBy")?.toString() ?? "Administrador"
            });
            setOpen(false);
            setEditing(null);
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="Alojamiento">
            <Select name="accommodationId" defaultValue={editing?.accommodationId ?? state.units[0]?.id}>
              {state.units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Creado por"><Input name="createdBy" defaultValue={editing?.createdBy ?? "Administrador"} /></Field>
          <Field label="Desde"><Input name="startDate" type="date" defaultValue={editing?.startDate} required /></Field>
          <Field label="Hasta"><Input name="endDate" type="date" defaultValue={editing?.endDate} required /></Field>
          <div className="md:col-span-2">
            <Field label="Motivo"><Textarea name="reason" defaultValue={editing?.reason} /></Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Guardar bloqueo
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export function PricingSection() {
  const { state, updatePriceSeason, deletePriceSeason } = useAdmin();
  const [editing, setEditing] = useState<AdminPriceSeason | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AdminShell title="Precios" description="Administra las tarifas por temporada." sectionNumber="07">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Nueva temporada
          </button>
        </div>
        <Table headers={["Temporada", "Desde", "Hasta", ...state.units.map((unit) => unit.name), "Acciones"]}>
          {state.priceSeasons.map((season) => (
            <tr key={season.id} className="border-t border-[#f0e5db]">
              <td className="px-5 py-4 font-semibold text-[#241b16]">{season.name}</td>
              <td className="px-5 py-4 text-[#46362b]">{formatDate(season.startDate)}</td>
              <td className="px-5 py-4 text-[#46362b]">{formatDate(season.endDate)}</td>
              {state.units.map((unit) => (
                <td key={`${season.id}-${unit.id}`} className="px-5 py-4 text-[#46362b]">
                  {formatCurrency(season.prices[unit.id] ?? unit.price, "ARS")}
                </td>
              ))}
              <td className="px-5 py-4">
                <RowActions
                  onEdit={() => {
                    setEditing(season);
                    setOpen(true);
                  }}
                  onDelete={() => deletePriceSeason(season.id)}
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
      <Modal open={open} title={editing ? "Editar temporada" : "Nueva temporada"} onClose={() => setOpen(false)}>
        <form
          action={(formData) => {
            const prices = state.units.reduce<Record<string, number>>((accumulator, unit) => {
              accumulator[unit.id] = Number(formData.get(`price-${unit.id}`)?.toString() ?? unit.price);
              return accumulator;
            }, {});

            updatePriceSeason({
              id: editing?.id ?? createId("season"),
              name: formData.get("name")?.toString() ?? "",
              startDate: formData.get("startDate")?.toString() ?? "",
              endDate: formData.get("endDate")?.toString() ?? "",
              prices
            });
            setOpen(false);
            setEditing(null);
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="Nombre"><Input name="name" defaultValue={editing?.name} required /></Field>
          <Field label="Desde"><Input name="startDate" type="date" defaultValue={editing?.startDate} required /></Field>
          <Field label="Hasta"><Input name="endDate" type="date" defaultValue={editing?.endDate} required /></Field>
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            {state.units.map((unit) => (
              <Field key={unit.id} label={unit.name}>
                <Input name={`price-${unit.id}`} type="number" min={0} defaultValue={editing?.prices[unit.id] ?? unit.price} required />
              </Field>
            ))}
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Guardar temporada
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export function InquiriesSection() {
  const { state, updateInquiry, deleteInquiry } = useAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<AdminInquiry | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = state.inquiries.filter((inquiry) => {
    const matchesSearch =
      inquiry.name.toLowerCase().includes(search.toLowerCase()) ||
      inquiry.subject.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || inquiry.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <AdminShell title="Consultas / Inquiries" description="Gestiona consultas recibidas desde el sitio y WhatsApp." sectionNumber="08">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={[
            { value: "all", label: "Todas" },
            { value: "new", label: "Nuevas" },
            { value: "in_progress", label: "En proceso" },
            { value: "resolved", label: "Respondidas" }
          ]}
          actionLabel="Nueva consulta"
          onAction={() => {
            setEditing(null);
            setOpen(true);
          }}
        />
        <Table headers={["Fecha", "Nombre", "Contacto", "Asunto", "Estado", "Acciones"]}>
          {filtered.map((inquiry) => (
            <tr key={inquiry.id} className="border-t border-[#f0e5db]">
              <td className="px-5 py-4 text-[#7b695d]">{formatDate(inquiry.createdAt, "dd MMM HH:mm")}</td>
              <td className="px-5 py-4 font-semibold text-[#241b16]">{inquiry.name}</td>
              <td className="px-5 py-4 text-[#46362b]">{inquiry.contact}</td>
              <td className="px-5 py-4 text-[#46362b]">{inquiry.subject}</td>
              <td className="px-5 py-4"><StatusBadge value={inquiry.status} /></td>
              <td className="px-5 py-4">
                <RowActions
                  onEdit={() => {
                    setEditing(inquiry);
                    setOpen(true);
                  }}
                  onDelete={() => deleteInquiry(inquiry.id)}
                  extra={
                    <button className="rounded-lg p-2 text-[#7a6759] transition hover:bg-[#f6efe8]">
                      <Eye className="h-4 w-4" />
                    </button>
                  }
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
      <Modal open={open} title={editing ? "Editar consulta" : "Nueva consulta"} onClose={() => setOpen(false)}>
        <form
          action={(formData) => {
            updateInquiry({
              id: editing?.id ?? createId("inq"),
              createdAt: editing?.createdAt ?? new Date().toISOString(),
              name: formData.get("name")?.toString() ?? "",
              contact: formData.get("contact")?.toString() ?? "",
              channel: (formData.get("channel")?.toString() ?? "WhatsApp") as AdminInquiry["channel"],
              subject: formData.get("subject")?.toString() ?? "",
              message: formData.get("message")?.toString() ?? "",
              status: (formData.get("status")?.toString() ?? "new") as AdminInquiry["status"]
            });
            setOpen(false);
            setEditing(null);
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="Nombre"><Input name="name" defaultValue={editing?.name} required /></Field>
          <Field label="Contacto"><Input name="contact" defaultValue={editing?.contact} required /></Field>
          <Field label="Canal">
            <Select name="channel" defaultValue={editing?.channel ?? "WhatsApp"}>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Instagram">Instagram</option>
              <option value="Web">Web</option>
            </Select>
          </Field>
          <Field label="Estado">
            <Select name="status" defaultValue={editing?.status ?? "new"}>
              <option value="new">Nueva</option>
              <option value="in_progress">En proceso</option>
              <option value="resolved">Respondida</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Asunto"><Input name="subject" defaultValue={editing?.subject} required /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Mensaje"><Textarea name="message" defaultValue={editing?.message} /></Field>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Guardar consulta
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export function ContentSection() {
  const { state, updateSiteContent } = useAdmin();
  const [content, setContent] = useState<AdminSiteContent>(state.siteContent);
  const [faqDraft, setFaqDraft] = useState<AdminFaqItem>({ id: "", question: "", answer: "" });
  const [policyDraft, setPolicyDraft] = useState<AdminPolicyItem>({ id: "", title: "", body: "" });

  return (
    <AdminShell title="Contenido del sitio" description="Edita textos e imagenes del sitio web." sectionNumber="09">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <SectionCard title="Secciones">
            <div className="grid gap-4">
              <Field label="Título principal">
                <Input value={content.heroTitle} onChange={(event) => setContent((current) => ({ ...current, heroTitle: event.target.value }))} />
              </Field>
              <Field label="Subtitulo">
                <Textarea value={content.heroSubtitle} onChange={(event) => setContent((current) => ({ ...current, heroSubtitle: event.target.value }))} />
              </Field>
              <Field label="Imagen de hero">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    const [upload] = await uploadAdminFiles({
                      files: [file],
                      scope: "content",
                      entityId: "hero"
                    });

                    if (upload) {
                      setContent((current) => ({ ...current, heroImage: upload.url }));
                    }
                  }}
                  className="block w-full rounded-xl border border-[#e7d8ca] px-4 py-3 text-sm text-[#241b16]"
                />
              </Field>
              <Field label="Título de nosotros">
                <Input value={content.aboutTitle} onChange={(event) => setContent((current) => ({ ...current, aboutTitle: event.target.value }))} />
              </Field>
              <Field label="Descripcion de nosotros">
                <Textarea value={content.aboutBody} onChange={(event) => setContent((current) => ({ ...current, aboutBody: event.target.value }))} />
              </Field>
            </div>
          </SectionCard>
          <SectionCard title="Imagen de portada">
            <div className="relative aspect-[1.3] overflow-hidden rounded-[24px]">
              <Image alt="Hero" fill src={content.heroImage} className="object-cover" />
            </div>
          </SectionCard>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <SectionCard title="Preguntas frecuentes">
            <div className="space-y-4">
              {content.faqs.map((faq) => (
                <div key={faq.id} className="rounded-2xl border border-[#f0e5db] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#241b16]">{faq.question}</p>
                      <p className="mt-2 text-sm text-[#5f4f43]">{faq.answer}</p>
                    </div>
                    <button
                      onClick={() =>
                        setContent((current) => ({
                          ...current,
                          faqs: current.faqs.filter((item) => item.id !== faq.id)
                        }))
                      }
                      className="rounded-lg p-2 text-[#c1473d]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="grid gap-3">
                <Input placeholder="Pregunta" value={faqDraft.question} onChange={(event) => setFaqDraft((current) => ({ ...current, question: event.target.value }))} />
                <Textarea placeholder="Respuesta" value={faqDraft.answer} onChange={(event) => setFaqDraft((current) => ({ ...current, answer: event.target.value }))} />
                <button
                  onClick={() => {
                    if (!faqDraft.question || !faqDraft.answer) {
                      return;
                    }
                    setContent((current) => ({
                      ...current,
                      faqs: [...current.faqs, { ...faqDraft, id: createId("faq") }]
                    }));
                    setFaqDraft({ id: "", question: "", answer: "" });
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#cfae92] text-sm font-semibold text-[#7d4d27]"
                >
                  <Plus className="h-4 w-4" />
                  Agregar FAQ
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Políticas">
            <div className="space-y-4">
              {content.policies.map((policy) => (
                <div key={policy.id} className="rounded-2xl border border-[#f0e5db] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#241b16]">{policy.title}</p>
                      <p className="mt-2 text-sm text-[#5f4f43]">{policy.body}</p>
                    </div>
                    <button
                      onClick={() =>
                        setContent((current) => ({
                          ...current,
                          policies: current.policies.filter((item) => item.id !== policy.id)
                        }))
                      }
                      className="rounded-lg p-2 text-[#c1473d]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="grid gap-3">
                <Input placeholder="Título" value={policyDraft.title} onChange={(event) => setPolicyDraft((current) => ({ ...current, title: event.target.value }))} />
                <Textarea placeholder="Detalle" value={policyDraft.body} onChange={(event) => setPolicyDraft((current) => ({ ...current, body: event.target.value }))} />
                <button
                  onClick={() => {
                    if (!policyDraft.title || !policyDraft.body) {
                      return;
                    }
                    setContent((current) => ({
                      ...current,
                      policies: [...current.policies, { ...policyDraft, id: createId("pol") }]
                    }));
                    setPolicyDraft({ id: "", title: "", body: "" });
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#cfae92] text-sm font-semibold text-[#7d4d27]"
                >
                  <Plus className="h-4 w-4" />
                  Agregar politica
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => void updateSiteContent(content)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white"
          >
            <Save className="h-4 w-4" />
            Guardar cambios
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

export function GallerySection() {
  const { state, createGalleryItems, updateGalleryItem, deleteGalleryItem } = useAdmin();
  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const [editing, setEditing] = useState<AdminGalleryItem | null>(null);
  const [open, setOpen] = useState(false);

  const visibleItems = state.gallery.filter((item) => filter === "all" || item.category === filter);

  return (
    <AdminShell title="Galeria" description="Administra las imagenes del alojamiento." sectionNumber="10">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "Todas" },
              { value: "inicio", label: "Inicio" },
              { value: "alojamientos", label: "Alojamientos" },
              { value: "servicios", label: "Servicios" },
              { value: "entorno", label: "Entorno" }
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value as GalleryCategory | "all")}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm",
                  filter === item.value
                    ? "border-[#8f5625] bg-[#f8eee3] text-[#8f5625]"
                    : "border-[#eadccf] bg-white text-[#6b5a4d]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white"
          >
            <ImagePlus className="h-4 w-4" />
            Subir imagen
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleItems.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-[24px] border border-[#eadccf] bg-white shadow-[0_18px_50px_rgba(71,45,24,0.06)]">
              <div className="relative aspect-[1.06]">
                <Image alt={item.title} fill src={item.image} className="object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#241b16]">{item.title}</p>
                    <p className="mt-1 text-sm capitalize text-[#7b695d]">{item.category}</p>
                  </div>
                  <RowActions
                    onEdit={() => {
                      setEditing(item);
                      setOpen(true);
                    }}
                      onDelete={() => void deleteGalleryItem(item.id)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal open={open} title={editing ? "Editar imagen" : "Nueva imagen"} onClose={() => setOpen(false)}>
        <form
          action={async (formData) => {
            const title = formData.get("title")?.toString() ?? "";
            const category = (formData.get("category")?.toString() ?? "inicio") as GalleryCategory;
            const files = formData
              .getAll("images")
              .filter((entry): entry is File => entry instanceof File && entry.size > 0);

            const uploads = await uploadAdminFiles({
              files,
              scope: "gallery",
              entityId: category
            });

            if (editing) {
              await updateGalleryItem({
                id: editing.id,
                title,
                category,
                image: uploads[0]?.url ?? editing.image,
                storagePath: uploads[0]?.path ?? editing.storagePath
              });
            } else {
              await createGalleryItems({
                title,
                category,
                uploads
              });
            }
            setOpen(false);
            setEditing(null);
          }}
          className="grid gap-4"
        >
          <Field label="Título"><Input name="title" defaultValue={editing?.title} required /></Field>
          <Field label="Categoría">
            <Select name="category" defaultValue={editing?.category ?? "inicio"}>
              <option value="inicio">Inicio</option>
              <option value="alojamientos">Alojamientos</option>
              <option value="servicios">Servicios</option>
              <option value="entorno">Entorno</option>
            </Select>
          </Field>
          <Field label={editing ? "Reemplazar imagen" : "Imágenes"}>
            <input
              name="images"
              type="file"
              accept="image/*"
              multiple={!editing}
              className="block w-full rounded-xl border border-[#e7d8ca] px-4 py-3 text-sm text-[#241b16]"
              required={!editing}
            />
          </Field>
          {editing ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#eadccf]">
              <Image alt={editing.title} fill src={editing.image} className="object-cover" />
            </div>
          ) : null}
          <div className="flex justify-end">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Guardar imagen
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export function UsersSection() {
  const { state, updateUser, deleteUser } = useAdmin();
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AdminShell title="Usuarios" description="Gestiona usuarios con acceso al panel." sectionNumber="11">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </button>
        </div>
        <Table headers={["Nombre", "Email", "Rol", "Estado", "Ultimo acceso", "Acciones"]}>
          {state.users.map((user) => (
            <tr key={user.id} className="border-t border-[#f0e5db]">
              <td className="px-5 py-4 font-semibold text-[#241b16]">{user.name}</td>
              <td className="px-5 py-4 text-[#46362b]">{user.email}</td>
              <td className="px-5 py-4 text-[#46362b]">{user.role}</td>
              <td className="px-5 py-4"><StatusBadge value={user.status} /></td>
              <td className="px-5 py-4 text-[#7b695d]">{formatDate(user.lastAccess, "dd/MM/yyyy HH:mm")}</td>
              <td className="px-5 py-4">
                <RowActions
                  onEdit={() => {
                    setEditing(user);
                    setOpen(true);
                  }}
                  onDelete={() => deleteUser(user.id)}
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
      <Modal open={open} title={editing ? "Editar usuario" : "Nuevo usuario"} onClose={() => setOpen(false)}>
        <form
          action={(formData) => {
            updateUser({
              id: editing?.id ?? createId("usr"),
              name: formData.get("name")?.toString() ?? "",
              email: formData.get("email")?.toString() ?? "",
              role: (formData.get("role")?.toString() ?? "Editor") as AdminUser["role"],
              status: (formData.get("status")?.toString() ?? "active") as AdminUser["status"],
              lastAccess: editing?.lastAccess ?? new Date().toISOString()
            });
            setOpen(false);
            setEditing(null);
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="Nombre"><Input name="name" defaultValue={editing?.name} required /></Field>
          <Field label="Email"><Input name="email" type="email" defaultValue={editing?.email} required /></Field>
          <Field label="Rol">
            <Select name="role" defaultValue={editing?.role ?? "Editor"}>
              <option value="Administrador">Administrador</option>
              <option value="Editor">Editor</option>
              <option value="Recepción">Recepción</option>
              <option value="Visualizador">Visualizador</option>
            </Select>
          </Field>
          <Field label="Estado">
            <Select name="status" defaultValue={editing?.status ?? "active"}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </Select>
          </Field>
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Guardar usuario
            </button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export function SettingsSection() {
  const { state, updateSettings, resetState } = useAdmin();
  const [settings, setSettings] = useState<AdminSettings>(state.settings);

  return (
    <AdminShell title="Configuración" description="Ajustes generales del sistema." sectionNumber="12">
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-[0.44fr_1fr]">
          <SectionCard title="Secciones del panel">
            <div className="space-y-3 text-sm text-[#5f4f43]">
              {["General", "Alojamiento", "Notificaciones", "Pagos", "Integraciones", "Seguridad"].map((item) => (
                <div key={item} className={cn("rounded-xl px-4 py-3", item === "General" ? "bg-[#f8eee3] text-[#8f5625]" : "bg-[#fcfaf8]")}>
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Configuración" action={<MapPin className="h-5 w-5 text-[#8f5625]" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del alojamiento"><Input value={settings.propertyName} onChange={(event) => setSettings((current) => ({ ...current, propertyName: event.target.value }))} /></Field>
              <Field label="Email de contacto"><Input value={settings.contactEmail} onChange={(event) => setSettings((current) => ({ ...current, contactEmail: event.target.value }))} /></Field>
              <Field label="Teléfono"><Input value={settings.phone} onChange={(event) => setSettings((current) => ({ ...current, phone: event.target.value }))} /></Field>
              <Field label="Moneda"><Input value={settings.currency} onChange={(event) => setSettings((current) => ({ ...current, currency: event.target.value }))} /></Field>
              <Field label="Zona horaria"><Input value={settings.timezone} onChange={(event) => setSettings((current) => ({ ...current, timezone: event.target.value }))} /></Field>
              <Field label="Dirección"><Input value={settings.address} onChange={(event) => setSettings((current) => ({ ...current, address: event.target.value }))} /></Field>
              <Field label="Check-in"><Input value={settings.checkInTime} onChange={(event) => setSettings((current) => ({ ...current, checkInTime: event.target.value }))} /></Field>
              <Field label="Check-out"><Input value={settings.checkOutTime} onChange={(event) => setSettings((current) => ({ ...current, checkOutTime: event.target.value }))} /></Field>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={resetState}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#cfae92] px-5 text-sm font-semibold text-[#7d4d27]"
              >
                <Clock3 className="h-4 w-4" />
                Restaurar demo
              </button>
              <button
                onClick={() => void updateSettings(settings)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-5 text-sm font-semibold text-white"
              >
                <Save className="h-4 w-4" />
                Guardar cambios
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </AdminShell>
  );
}
