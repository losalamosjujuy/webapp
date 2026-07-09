import { NextResponse } from "next/server";

import { searchUnits } from "@/lib/data-access";
import { availabilitySearchSchema } from "@/lib/validations/reservation";

export async function POST(request: Request) {
  const body = await request.json();
  const values = availabilitySearchSchema.parse(body);
  const units = await searchUnits(values);

  return NextResponse.json({
    units: units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      featuredImage: unit.featuredImage,
      shortDescription: unit.shortDescription,
      basePricePerNight: unit.basePricePerNight,
      maxGuests: unit.maxGuests
    }))
  });
}
