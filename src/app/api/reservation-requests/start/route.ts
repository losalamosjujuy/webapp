import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/errors";
import { startReservationRequestVerification } from "@/lib/data-access";
import { getRequestIp } from "@/lib/reservations/http";
import { assertRateLimit } from "@/lib/reservations/rate-limit";
import { reservationRequestStartSchema } from "@/lib/validations/reservation";

export async function POST(request: Request) {
  try {
    assertRateLimit({
      key: `reservation-start:${getRequestIp(request)}`,
      limit: 5,
      windowMs: 10 * 60_000
    });

    const body = await request.json();
    const payload = reservationRequestStartSchema.parse(body);
    const result = await startReservationRequestVerification(payload);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const message = getErrorMessage(error, "No pudimos iniciar la reserva.");
    console.error("[reservation-requests/start]", error);

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 400 }
    );
  }
}
