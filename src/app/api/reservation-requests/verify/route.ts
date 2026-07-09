import { NextResponse } from "next/server";

import { verifyReservationRequestCode } from "@/lib/data-access";
import { getErrorMessage } from "@/lib/errors";
import { getRequestIp } from "@/lib/reservations/http";
import { assertRateLimit } from "@/lib/reservations/rate-limit";
import { reservationVerificationSchema } from "@/lib/validations/reservation";

export async function POST(request: Request) {
  try {
    assertRateLimit({
      key: `reservation-verify:${getRequestIp(request)}`,
      limit: 10,
      windowMs: 10 * 60_000
    });

    const body = await request.json();
    const payload = reservationVerificationSchema.parse(body);
    const result = await verifyReservationRequestCode(payload);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const message = getErrorMessage(error, "No pudimos validar el código.");
    console.error("[reservation-requests/verify]", error);

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 400 }
    );
  }
}
