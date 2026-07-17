"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAppFeedback } from "@/components/feedback/app-feedback-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { reservationLookupSchema } from "@/lib/validations/reservation";
import type { PublicReservationLookup } from "@/types/domain";

type ReservationLookupFormValues = z.infer<typeof reservationLookupSchema>;

export function PublicReservationLookupPanel({
  supportUrl
}: {
  supportUrl?: string;
}) {
  const { runBlockingAction } = useAppFeedback();
  const [reservation, setReservation] = useState<PublicReservationLookup | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const form = useForm<ReservationLookupFormValues>({
    resolver: zodResolver(reservationLookupSchema),
    defaultValues: {
      email: "",
      reservationCode: ""
    }
  });

  useEffect(() => {
    setReservation(null);
    setRequestError(null);
    setNotFound(false);
    form.reset({
      email: "",
      reservationCode: ""
    });
  }, [form]);

  async function onSubmit(values: ReservationLookupFormValues) {
    setReservation(null);
    setRequestError(null);
    setNotFound(false);

    try {
      const payload = await runBlockingAction(
        async () => {
          const response = await fetch("/api/reservations/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
          });

          const data = (await response.json().catch(() => null)) as
            | { reservation?: PublicReservationLookup; error?: string }
            | null;

          if (!response.ok) {
            if (response.status === 404) {
              return { notFound: true } as const;
            }

            throw new Error(data?.error ?? "No pudimos consultar la reserva. Intentalo nuevamente");
          }

          if (!data?.reservation) {
            throw new Error("No pudimos consultar la reserva. Intentalo nuevamente");
          }

          return { notFound: false, reservation: data.reservation } as const;
        },
        {
          loadingMessage: "Estamos consultando el estado de tu reserva."
        }
      );

      if (payload.notFound) {
        setNotFound(true);
        return;
      }

      setReservation(payload.reservation);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "No pudimos consultar la reserva. Intentalo nuevamente"
      );
    }
  }

  const paymentStatusLabel = getPaymentStatusLabel(reservation?.paymentStatus);
  const canContinuePayment =
    reservation?.checkoutUrl &&
    (reservation.status === "pending_payment" || reservation.status === "verified_pending_payment");

  return (
    <div>
      <p className="mb-5 text-[16px] leading-8 text-[var(--color-ink-2)]">
        Ingresa el email registrado y el codigo que te enviamos por email. La consulta solo se muestra si ambos datos coinciden.
      </p>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="text-sm text-[var(--color-ink-2)]">
          Email
          <Input className="mt-2 rounded-[16px] border-[var(--color-rule)]" type="email" {...form.register("email")} />
          {form.formState.errors.email ? (
            <span className="mt-2 block text-sm text-[var(--color-danger)]">
              {form.formState.errors.email.message}
            </span>
          ) : null}
        </label>
        <label className="text-sm text-[var(--color-ink-2)]">
          Codigo de reserva
          <Input
            className="mt-2 rounded-[16px] border-[var(--color-rule)]"
            placeholder="Ej: LAT-240701"
            {...form.register("reservationCode")}
          />
          {form.formState.errors.reservationCode ? (
            <span className="mt-2 block text-sm text-[var(--color-danger)]">
              {form.formState.errors.reservationCode.message}
            </span>
          ) : null}
        </label>
        {requestError ? <p className="text-sm text-[var(--color-danger)]">{requestError}</p> : null}
        <div className="flex justify-end">
          <Button className="rounded-[16px] px-6" type="submit" variant="secondary">
            {form.formState.isSubmitting ? "Validando..." : "Consultar reserva"}
          </Button>
        </div>
      </form>

      {reservation ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-[20px] border border-[var(--color-rule)] bg-[oklch(0.98_0.01_80)] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
                  Codigo de reserva
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
                  {reservation.reservationCode}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
                  Alojamiento
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">{reservation.unitName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
                  Fechas
                </p>
                <p className="mt-2 text-sm text-[var(--color-ink)]">
                  {formatDate(reservation.checkIn)} al {formatDate(reservation.checkOut)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
                  Huespedes
                </p>
                <p className="mt-2 text-sm text-[var(--color-ink)]">
                  {reservation.adults} adultos
                  {reservation.children > 0 ? `, ${reservation.children} ninos` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
                  Estado de reserva
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                  {getReservationStatusLabel(reservation.status)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
                  Estado de pago
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                  {paymentStatusLabel ?? "Sin informacion de pago"}
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-[var(--color-rule)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
                Total
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                {formatCurrency(reservation.totalAmount, reservation.currency)}
              </p>
            </div>
          </div>
          {canContinuePayment ? (
            <a className="hallmark-button-secondary inline-flex" href={reservation.checkoutUrl} rel="noreferrer" target="_blank">
              Continuar pago
            </a>
          ) : null}
        </div>
      ) : null}

      {notFound ? (
        <div className="mt-6 rounded-[20px] border border-[var(--color-rule)] bg-[oklch(0.99_0.01_80)] p-5">
          <p className="text-sm text-[var(--color-ink-2)]">
            No pudimos validar una reserva con el codigo y el email ingresados.
          </p>
          {supportUrl ? (
            <a
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent-strong)]"
              href={supportUrl}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle className="h-4 w-4" />
              Pedir ayuda por WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getReservationStatusLabel(status: PublicReservationLookup["status"]) {
  return RESERVATION_STATUS_LABELS[status] ?? status;
}

function getPaymentStatusLabel(status?: PublicReservationLookup["paymentStatus"]) {
  if (!status) {
    return null;
  }

  return PAYMENT_STATUS_LABELS[status] ?? status;
}

const RESERVATION_STATUS_LABELS: Record<PublicReservationLookup["status"], string> = {
  pending_verification: "Esperando validacion de email",
  verified_pending_payment: "Pendiente de pago",
  expired_verification: "Verificacion vencida",
  expired_hold: "Reserva vencida",
  pending_payment: "Pendiente de pago",
  pending: "Pendiente",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  canceled: "Cancelada",
  completed: "Completada",
  no_show: "No show"
};

const PAYMENT_STATUS_LABELS: Record<NonNullable<PublicReservationLookup["paymentStatus"]>, string> = {
  pending: "Pendiente",
  authorized: "Autorizado",
  in_process: "En proceso",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reintegrado",
  charged_back: "Desconocido por contracargo",
  expired: "Vencido"
};
