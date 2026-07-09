import { NextResponse } from "next/server";

import { createReservationCheckoutFromVerifiedRequest } from "@/lib/data-access";
import { getErrorMessage } from "@/lib/errors";
import { getRequestIp } from "@/lib/reservations/http";
import { assertRateLimit } from "@/lib/reservations/rate-limit";
import { reservationCheckoutSchema } from "@/lib/validations/reservation";

export async function POST(request: Request) {
  try {
    assertRateLimit({
      key: `reservation-checkout:${getRequestIp(request)}`,
      limit: 10,
      windowMs: 10 * 60_000
    });

    const body = await request.json();
    const payload = reservationCheckoutSchema.parse(body);
    const result = await createReservationCheckoutFromVerifiedRequest(payload);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const message = getErrorMessage(error, "No pudimos generar el checkout.");
    console.error("[reservation-requests/checkout]", error);

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 400 }
    );
  }
}
