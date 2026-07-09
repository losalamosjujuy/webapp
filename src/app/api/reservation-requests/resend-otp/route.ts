import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/errors";
import { resendReservationRequestCode } from "@/lib/data-access";
import { getRequestIp } from "@/lib/reservations/http";
import { assertRateLimit } from "@/lib/reservations/rate-limit";
import { reservationOtpResendSchema } from "@/lib/validations/reservation";

export async function POST(request: Request) {
  try {
    assertRateLimit({
      key: `reservation-resend:${getRequestIp(request)}`,
      limit: 5,
      windowMs: 10 * 60_000
    });

    const body = await request.json();
    const payload = reservationOtpResendSchema.parse(body);
    const result = await resendReservationRequestCode(payload);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const message = getErrorMessage(error, "No pudimos reenviar el código.");
    console.error("[reservation-requests/resend-otp]", error);

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 400 }
    );
  }
}
