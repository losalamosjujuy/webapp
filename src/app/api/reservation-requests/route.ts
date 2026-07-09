import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "El flujo anterior fue reemplazado. Usa /api/reservation-requests/start, /verify y /checkout."
    },
    { status: 410 }
  );
}
