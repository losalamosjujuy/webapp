export interface PricingInput {
  nights: number;
  basePricePerNight: number;
  cleaningFee?: number;
}

export interface PricingSnapshot extends Omit<PricingInput, "cleaningFee"> {
  cleaningFee: number;
  subtotal: number;
  total: number;
}

export function buildPricingSnapshot({
  nights,
  basePricePerNight,
  cleaningFee = 0
}: PricingInput): PricingSnapshot {
  const subtotal = nights * basePricePerNight;

  return {
    nights,
    basePricePerNight,
    cleaningFee,
    subtotal,
    total: subtotal + cleaningFee
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
  basePricePerNight?: number;
  cleaningFee?: number;
}) {
  const nights = calculateNightsFromDates(params.checkIn, params.checkOut);

  if (!nights || !params.basePricePerNight) {
    return null;
  }

  return buildPricingSnapshot({
    nights,
    basePricePerNight: params.basePricePerNight,
    cleaningFee: params.cleaningFee ?? 0
  });
}
