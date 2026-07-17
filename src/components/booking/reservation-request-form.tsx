"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAppFeedback } from "@/components/feedback/app-feedback-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildPricingPreview } from "@/lib/pricing/pricing";
import { formatCurrency } from "@/lib/utils/format";
import { reservationRequestSchema } from "@/lib/validations/reservation";
import type { Unit } from "@/types/domain";

type FormValues = z.infer<typeof reservationRequestSchema>;

type OtpStep = "form" | "otp" | "done";

export function ReservationRequestForm({ units }: { units: Unit[] }) {
  const { runBlockingAction } = useAppFeedback();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("form");
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(reservationRequestSchema),
    defaultValues: {
      adults: 2,
      children: 0
    }
  });
  const watchedUnitId = form.watch("unitId");
  const watchedCheckIn = form.watch("checkIn");
  const watchedCheckOut = form.watch("checkOut");
  const watchedAdults = form.watch("adults");
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === watchedUnitId),
    [units, watchedUnitId]
  );
  const selectedAdultRate = useMemo(
    () => selectedUnit?.adultPriceRates.find((rate) => rate.active && rate.adults === watchedAdults),
    [selectedUnit, watchedAdults]
  );
  const pricingPreview = useMemo(
    () =>
      buildPricingPreview({
        checkIn: watchedCheckIn,
        checkOut: watchedCheckOut,
        pricePerNight: selectedAdultRate?.pricePerNight,
        cleaningFee: selectedUnit?.cleaningFee,
        depositPercentage: 10
      }),
    [selectedAdultRate?.pricePerNight, selectedUnit?.cleaningFee, watchedCheckIn, watchedCheckOut]
  );

  async function onSubmit(values: FormValues) {
    setRequestId(null);
    setMaskedEmail(null);
    setSubmittedCode(null);
    setCheckoutUrl(null);
    setRequestError(null);

    try {
      const data = await runBlockingAction(
        async () => {
          const response = await fetch("/api/reservation-requests/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
          });

          const payload = (await response.json().catch(() => null)) as
            | { requestId?: string; maskedEmail?: string; error?: string }
            | null;

          if (!response.ok || !payload?.requestId || !payload?.maskedEmail) {
            throw new Error(payload?.error ?? "No pudimos iniciar la reserva.");
          }

          return {
            requestId: payload.requestId,
            maskedEmail: payload.maskedEmail
          };
        },
        {
          loadingMessage: "Estamos iniciando tu solicitud de reserva.",
          successMessage: "Te enviamos el codigo de verificacion por email."
        }
      );

      setRequestId(data.requestId);
      setMaskedEmail(data.maskedEmail);
      setOtpStep("otp");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "No pudimos iniciar la reserva.");
    }
  }

  async function handleOtpVerification() {
    if (!requestId) {
      setRequestError("No encontramos una solicitud activa para verificar.");
      return;
    }

    setRequestError(null);

    try {
      const data = await runBlockingAction(
        async () => {
          const verifyResponse = await fetch("/api/reservation-requests/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId,
              code: otpCode
            })
          });

          const verifyPayload = (await verifyResponse.json().catch(() => null)) as
            | { error?: string }
            | null;

          if (!verifyResponse.ok) {
            throw new Error(verifyPayload?.error ?? "Codigo invalido o vencido.");
          }

          const checkoutResponse = await fetch("/api/reservation-requests/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId
            })
          });

          const checkoutPayload = (await checkoutResponse.json().catch(() => null)) as
            | { reservationCode?: string; checkoutUrl?: string | null; error?: string }
            | null;

          if (!checkoutResponse.ok) {
            throw new Error(checkoutPayload?.error ?? "No pudimos generar el checkout.");
          }

          if (!checkoutPayload?.checkoutUrl || !checkoutPayload.reservationCode) {
            throw new Error("No pudimos iniciar el checkout de Mercado Pago.");
          }

          return {
            reservationCode: checkoutPayload.reservationCode,
            checkoutUrl: checkoutPayload.checkoutUrl
          };
        },
        {
          loadingMessage: "Estamos validando el codigo y preparando el pago.",
          successMessage: "Codigo validado. Redirigiendo al checkout."
        }
      );

      setSubmittedCode(data.reservationCode);
      setCheckoutUrl(data.checkoutUrl);
      setOtpStep("done");
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "No pudimos validar el c\u00F3digo.");
    }
  }

  async function handleOtpResend() {
    if (!requestId) {
      setRequestError("No encontramos una solicitud activa para reenviar el c\u00F3digo.");
      return;
    }

    setRequestError(null);

    try {
      const data = await runBlockingAction(
        async () => {
          const response = await fetch("/api/reservation-requests/resend-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId
            })
          });

          const payload = (await response.json().catch(() => null)) as
            | { maskedEmail?: string; error?: string }
            | null;

          if (!response.ok || !payload?.maskedEmail) {
            throw new Error(payload?.error ?? "No pudimos reenviar el codigo.");
          }

          return { maskedEmail: payload.maskedEmail };
        },
        {
          loadingMessage: "Estamos reenviando el codigo de verificacion.",
          successMessage: "Te reenviamos el codigo por email."
        }
      );

      setMaskedEmail(data.maskedEmail);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "No pudimos reenviar el codigo.");
    }
  }

  function resetFlow() {
    form.reset({
      adults: 2,
      children: 0
    });
    setRequestId(null);
    setMaskedEmail(null);
    setOtpCode("");
    setOtpStep("form");
    setSubmittedCode(null);
    setCheckoutUrl(null);
    setRequestError(null);
  }

  return (
    <Card className="p-6" id="reservar">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-clay">
          Solicitud de reserva
        </p>
        <h3 className="mt-3 font-display text-3xl text-night">Valid\u00E1 tu email antes de pagar.</h3>
      </div>

      {otpStep === "form" ? (
        <>
          <p className="mb-6 text-sm text-sand-700">
            {"Primero te enviamos un c\u00F3digo por email. Cuando lo valid\u00E1s, generamos el checkout de Mercado Pago."}
          </p>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <label className="text-sm text-sand-700">
              Nombre completo
              <Input {...form.register("fullName")} />
            </label>
            <label className="text-sm text-sand-700">
              WhatsApp
              <Input {...form.register("phone")} />
            </label>
            <label className="text-sm text-sand-700">
              Email
              <Input type="email" {...form.register("email")} />
            </label>
            <label className="text-sm text-sand-700">
              Ciudad
              <Input {...form.register("city")} />
            </label>
            <label className="text-sm text-sand-700">
              Pa\u00EDs
              <Input {...form.register("country")} />
            </label>
            <label className="text-sm text-sand-700">
              Unidad
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-sand-200 bg-white px-4 text-sm"
                {...form.register("unitId")}
              >
                <option value="">Cualquier unidad</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="md:col-span-2">
              <DateRangePicker
                checkIn={watchedCheckIn}
                checkOut={watchedCheckOut}
                monthsToShow={1}
                onChange={({ checkIn, checkOut }) => {
                  form.setValue("checkIn", checkIn, { shouldDirty: true, shouldValidate: true });
                  form.setValue("checkOut", checkOut, { shouldDirty: true, shouldValidate: true });
                }}
              />
            </div>
            <label className="text-sm text-sand-700">
              Adultos
              <Input min={1} type="number" {...form.register("adults")} />
            </label>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm text-sand-700">
              El valor se calcula segun la cantidad de adultos y las noches seleccionadas. La solicitud queda sujeta a confirmacion de disponibilidad.
            </div>
            <label className="text-sm text-sand-700 md:col-span-2">
              Notas especiales
              <Textarea {...form.register("specialNotes")} />
            </label>
            <label className="text-sm text-sand-700">
              Hora estimada de llegada
              <Input placeholder="18:30" {...form.register("estimatedArrivalTime")} />
            </label>
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand-700">
                Resumen de la reserva
              </p>
              {selectedUnit && pricingPreview ? (
                <div className="mt-3 space-y-2 text-sm text-sand-700">
                  <div className="flex items-center justify-between gap-4">
                    <span>Precio por noche</span>
                    <strong className="text-night">{formatCurrency(pricingPreview.pricePerNight, "ARS")}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Noches</span>
                    <strong className="text-night">
                      {pricingPreview.nights} {pricingPreview.nights === 1 ? "noche" : "noches"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Total alojamiento</span>
                    <strong className="text-night">{formatCurrency(pricingPreview.subtotal, "ARS")}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Limpieza</span>
                    <strong className="text-night">{formatCurrency(pricingPreview.cleaningFee, "ARS")}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Sena inicial (10%)</span>
                    <strong className="text-night">{formatCurrency(pricingPreview.depositAmount, "ARS")}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-sand-200 pt-2 text-base">
                    <span className="font-semibold text-night">Total estimado</span>
                    <strong className="text-night">{formatCurrency(pricingPreview.total, "ARS")}</strong>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-sand-700">
                  Elegi una unidad y completa check-in, check-out y adultos para ver la cotizacion.
                </p>
              )}
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit">
                {form.formState.isSubmitting ? "Enviando codigo..." : "Solicitar reserva"}
              </Button>
            </div>
          </form>
        </>
      ) : null}

      {otpStep === "otp" ? (
        <div className="space-y-4">
          <p className="rounded-2xl bg-agave/10 p-4 text-sm text-agave">
            {"Te enviamos un c\u00F3digo a "}<strong>{maskedEmail}</strong>{". Ingresalo para continuar al pago."}
          </p>
          {selectedUnit && pricingPreview ? (
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand-700">Resumen del pago inicial</p>
              <div className="mt-3 space-y-2 text-sm text-sand-700">
                <div className="flex items-center justify-between gap-4">
                  <span>Precio por noche</span>
                  <strong className="text-night">{formatCurrency(pricingPreview.pricePerNight, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Total estimado</span>
                  <strong className="text-night">{formatCurrency(pricingPreview.total, "ARS")}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-sand-200 pt-2 text-base">
                  <span className="font-semibold text-night">Sena a pagar</span>
                  <strong className="text-night">{formatCurrency(pricingPreview.depositAmount, "ARS")}</strong>
                </div>
              </div>
            </div>
          ) : null}
          <label className="block text-sm text-sand-700">
            C\u00F3digo OTP
            <Input
              className="mt-1 text-center text-lg tracking-[0.35em]"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              value={otpCode}
            />
          </label>
          <div className="flex flex-col gap-3 md:flex-row">
            <Button onClick={() => void handleOtpVerification()} type="button">
              Validar y continuar al pago
            </Button>
            <Button onClick={() => void handleOtpResend()} type="button" variant="outline">
              Reenviar codigo
            </Button>
            <Button onClick={resetFlow} type="button" variant="ghost">
              Empezar de nuevo
            </Button>
          </div>
        </div>
      ) : null}

      {otpStep === "done" ? (
        <div className="space-y-4">
          {checkoutUrl ? (
            <div className="space-y-4">
              <p className="rounded-2xl bg-agave/10 p-4 text-sm text-agave">
                {"Email validado correctamente. Ahora continuá el pago para confirmar la reserva."}
              </p>
              <a
                href={checkoutUrl}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-sand-200 px-5 text-sm font-semibold text-night"
              >
                Ir a Mercado Pago
              </a>
            </div>
          ) : (
            <p className="text-sm text-sand-700">
              {"No pudimos iniciar el checkout. Volvé a intentarlo."}
            </p>
          )}
          <div>
            <Button onClick={resetFlow} type="button" variant="outline">
              Crear otra solicitud
            </Button>
          </div>
        </div>
      ) : null}

      {form.formState.errors.checkOut ? (
        <p className="mt-4 text-sm text-destructive">{form.formState.errors.checkOut.message}</p>
      ) : null}
      {requestError ? <p className="mt-4 text-sm text-destructive">{requestError}</p> : null}
    </Card>
  );
}
