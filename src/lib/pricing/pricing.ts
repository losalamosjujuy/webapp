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
