"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Search } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { availabilitySearchSchema } from "@/lib/validations/reservation";
import { formatCurrency } from "@/lib/utils/format";
import type { Unit } from "@/types/domain";

type FormValues = z.infer<typeof availabilitySearchSchema>;

interface AvailabilityResult {
  units: Array<Pick<Unit, "id" | "name" | "shortDescription" | "basePricePerNight">>;
}

export function AvailabilitySearchForm({ units }: { units: Unit[] }) {
  const [results, setResults] = useState<AvailabilityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const defaultUnitId = useMemo(() => units[0]?.id ?? "", [units]);

  const form = useForm<FormValues>({
    resolver: zodResolver(availabilitySearchSchema),
    defaultValues: {
      guests: 2,
      unitId: defaultUnitId
    }
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    const response = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const data = (await response.json()) as AvailabilityResult;
    setResults(data);
    setIsLoading(false);
  }

  return (
    <Card className="p-6">
      <form className="grid gap-4 md:grid-cols-5" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="text-sm text-sand-700">
          Check-in
          <Input type="date" {...form.register("checkIn")} />
        </label>
        <label className="text-sm text-sand-700">
          Check-out
          <Input type="date" {...form.register("checkOut")} />
        </label>
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
            {isLoading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </form>
      {form.formState.errors.checkOut ? (
        <p className="mt-3 text-sm text-red-600">{form.formState.errors.checkOut.message}</p>
      ) : null}
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
                  Desde {formatCurrency(unit.basePricePerNight)} / noche
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
