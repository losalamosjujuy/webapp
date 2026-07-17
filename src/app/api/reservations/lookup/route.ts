import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { lookupPublicReservation } from "@/lib/data-access";
import { getRequestIp } from "@/lib/reservations/http";
import { assertRateLimit } from "@/lib/reservations/rate-limit";
import { reservationLookupSchema } from "@/lib/validations/reservation";

const NOT_FOUND_MESSAGE = "No pudimos validar una reserva con el codigo y el email ingresados.";
const GENERIC_ERROR_MESSAGE = "No pudimos consultar la reserva. Intentalo nuevamente.";

export async function POST(request: Request) {
  try {
    assertRateLimit({
      key: `reservation-lookup:${getRequestIp(request)}`,
      limit: 10,
      windowMs: 10 * 60_000
    });

    const body = await request.json();
    const payload = reservationLookupSchema.parse(body);
    const reservation = await lookupPublicReservation(payload);

    return NextResponse.json({
      ok: true,
      reservation
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.issues[0]?.message ?? GENERIC_ERROR_MESSAGE
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === NOT_FOUND_MESSAGE) {
      return NextResponse.json(
        {
          ok: false,
          error: NOT_FOUND_MESSAGE
        },
        { status: 404 }
      );
    }

    console.error("[reservations/lookup]", error);

    return NextResponse.json(
      {
        ok: false,
        error: GENERIC_ERROR_MESSAGE
      },
      { status: 500 }
    );
  }
}
