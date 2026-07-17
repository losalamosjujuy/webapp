"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Search } from "lucide-react";
import { z } from "zod";

import { useAppFeedback } from "@/components/feedback/app-feedback-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { availabilitySearchSchema } from "@/lib/validations/reservation";
import { formatCurrency } from "@/lib/utils/format";
import type { Unit } from "@/types/domain";

type FormValues = z.infer<typeof availabilitySearchSchema>;

interface AvailabilityResult {
  units: Array<Pick<Unit, "id" | "name" | "shortDescription" | "fromPricePerNight">>;
}

export function AvailabilitySearchForm({ units }: { units: Unit[] }) {
  const { runBlockingAction } = useAppFeedback();
  const [results, setResults] = useState<AvailabilityResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const defaultUnitId = useMemo(() => units[0]?.id ?? "", [units]);

  const form = useForm<FormValues>({
    resolver: zodResolver(availabilitySearchSchema),
    defaultValues: {
      guests: 2,
      unitId: defaultUnitId
    }
  });
  const watchedCheckIn = form.watch("checkIn");
  const watchedCheckOut = form.watch("checkOut");

  async function onSubmit(values: FormValues) {
    setRequestError(null);

    try {
      const data = await runBlockingAction(
        async () => {
          const response = await fetch("/api/availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
          });
          const payload = (await response.json().catch(() => null)) as
            | (AvailabilityResult & { error?: string })
            | null;

          if (!response.ok || !payload) {
            throw new Error(payload?.error ?? "No pudimos consultar disponibilidad.");
          }

          return payload;
        },
        {
          loadingMessage: "Estamos consultando la disponibilidad.",
          successMessage: (payload) =>
            payload.units.length
              ? "La disponibilidad se actualizo correctamente."
              : "No encontramos unidades para ese rango, pero la consulta se proceso."
        }
      );

      setResults(data);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "No pudimos consultar disponibilidad."
      );
    }
  }

  return (
    <Card className="p-6">
      <form className="grid gap-4 md:grid-cols-5" onSubmit={form.handleSubmit(onSubmit)}>
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
          Hu\u00E9spedes
          <Input min={1} type="number" {...form.register("guests")} />
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
        <div className="flex items-end">
          <Button className="w-full gap-2" type="submit">
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </div>
      </form>
      {form.formState.errors.checkOut ? (
        <p className="mt-3 text-sm text-red-600">{form.formState.errors.checkOut.message}</p>
      ) : null}
      {requestError ? <p className="mt-3 text-sm text-red-600">{requestError}</p> : null}
      {results ? (
        <div className="mt-6 grid gap-4">
          {results.units.length ? (
            results.units.map((unit) => (
              <div
                className="flex flex-col justify-between gap-3 rounded-2xl border border-sand-200 p-4 md:flex-row md:items-center"
                key={unit.id}
              >
                <div>
                  <p className="font-semibold text-night">{unit.name}</p>
                  <p className="text-sm text-sand-700">{unit.shortDescription}</p>
                </div>
                <p className="text-sm font-semibold text-clay">
                  Desde {formatCurrency(unit.fromPricePerNight)} / noche
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-sand-50 p-4 text-sm text-sand-700">
              {"No hay unidades libres para ese rango exacto. Igualmente pod\u00E9s enviar una solicitud y el equipo revisar\u00E1 alternativas."}
            </p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
