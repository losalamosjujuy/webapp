import type { AdultPriceRate, Unit } from "@/types/domain";

export interface PricingInput {
  nights: number;
  pricePerNight: number;
  cleaningFee?: number;
  depositPercentage?: number;
}

export interface PricingSnapshot extends Omit<PricingInput, "cleaningFee"> {
  cleaningFee: number;
  basePricePerNight: number;
  subtotal: number;
  total: number;
  depositAmount: number;
}

export function buildPricingSnapshot({
  nights,
  pricePerNight,
  cleaningFee = 0,
  depositPercentage = 10
}: PricingInput): PricingSnapshot {
  const subtotal = nights * pricePerNight;
  const total = subtotal + cleaningFee;
  const depositAmount = Math.ceil((total * depositPercentage) / 100);

  return {
    nights,
    pricePerNight,
    basePricePerNight: pricePerNight,
    cleaningFee,
    subtotal,
    total,
    depositPercentage,
    depositAmount
  };
}

export function calculateNightsFromDates(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) {
    return null;
  }

  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null;
  }

  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function buildPricingPreview(params: {
  checkIn?: string;
  checkOut?: string;
  pricePerNight?: number;
  basePricePerNight?: number;
  cleaningFee?: number;
  depositPercentage?: number;
}) {
  const nights = calculateNightsFromDates(params.checkIn, params.checkOut);
  const pricePerNight = params.pricePerNight ?? params.basePricePerNight;

  if (!nights || pricePerNight === undefined) {
    return null;
  }

  return buildPricingSnapshot({
    nights,
    pricePerNight,
    cleaningFee: params.cleaningFee ?? 0,
    depositPercentage: params.depositPercentage ?? 10
  });
}

function getActiveAdultPriceRates(rates: AdultPriceRate[]) {
  return rates.filter((rate) => rate.active).sort((left, right) => left.adults - right.adults);
}

export function getFromPricePerNight(unit: Pick<Unit, "adultPriceRates" | "basePricePerNight">) {
  const activeRates = getActiveAdultPriceRates(unit.adultPriceRates);
  return activeRates[0]?.pricePerNight ?? unit.basePricePerNight;
}

export function resolveAdultPriceRate(unit: Pick<Unit, "adultPriceRates">, adults: number) {
  return getActiveAdultPriceRates(unit.adultPriceRates).find((rate) => rate.adults === adults) ?? null;
}

export function buildStayQuote(params: {
  unit: Pick<Unit, "adultPriceRates" | "basePricePerNight" | "cleaningFee" | "maxGuests">;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  depositPercentage: number;
}) {
  if (!Number.isInteger(params.adults)) {
    throw new Error("La cantidad de adultos debe ser un numero entero.");
  }

  if (params.adults < 1) {
    throw new Error("Debes seleccionar al menos un adulto.");
  }

  if ((params.children ?? 0) > 0) {
    throw new Error("Por el momento no aceptamos ninos en las reservas web.");
  }

  if (params.adults > params.unit.maxGuests) {
    throw new Error("La cantidad de adultos supera la capacidad maxima del alojamiento.");
  }

  const nights = calculateNightsFromDates(params.checkIn, params.checkOut);

  if (!nights) {
    throw new Error("La fecha de salida debe ser posterior a la fecha de ingreso.");
  }

  const rate = resolveAdultPriceRate(params.unit, params.adults);

  if (!rate) {
    throw new Error("No encontramos una tarifa activa para la cantidad de adultos seleccionada.");
  }

  const snapshot = buildPricingSnapshot({
    nights,
    pricePerNight: rate.pricePerNight,
    cleaningFee: params.unit.cleaningFee,
    depositPercentage: params.depositPercentage
  });

  return {
    ...snapshot,
    adultsPriceRateId: rate.id
  };
}
